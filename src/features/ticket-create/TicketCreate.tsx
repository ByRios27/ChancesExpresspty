import React, { useEffect, useMemo, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/shared/lib/firebase";
import { useStore } from "@/store/useStore";
import { getDrawStatus } from "@/utils/helpers";

type CreateState = "idle" | "submitting" | "success" | "duplicate" | "error";

type CreateTicketResponse = {
  ok: boolean;
  created: boolean;
  ticketId: string;
  ticketCode: string;
  status: string;
  message?: string;
};

type CreatePlay = {
  number: string;
  playType: string;
  amount: number;
};

function buildDefaultBusinessDate() {
  return new Date().toISOString().slice(0, 10);
}

function generateIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export default function TicketCreate() {
  const currentUser = useStore((state) => state.currentUser);

  const contextSellerId = currentUser?.id?.trim() ?? "";
  const contextSellerCode = currentUser?.sellerId?.trim() ?? "";
  const hasTrustedSellerContext = Boolean(contextSellerId && contextSellerCode);

  const [sellerId, setSellerId] = useState("");
  const [sellerCode, setSellerCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [businessDate, setBusinessDate] = useState(buildDefaultBusinessDate());
  const [selectedDrawId, setSelectedDrawId] = useState("");
  const [drawsReadyCheck, setDrawsReadyCheck] = useState(false);

  const [playNumberInput, setPlayNumberInput] = useState("");
  const [playTypeInput, setPlayTypeInput] = useState("");
  const [playAmountInput, setPlayAmountInput] = useState("");
  const [plays, setPlays] = useState<CreatePlay[]>([]);

  const [state, setState] = useState<CreateState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [attemptIdempotencyKey, setAttemptIdempotencyKey] = useState<string | null>(null);
  const [result, setResult] = useState<CreateTicketResponse | null>(null);
  const draws = useStore((state) => state.draws);

  const effectiveSellerId = contextSellerId || sellerId.trim();
  const effectiveSellerCode = contextSellerCode || sellerCode.trim();

  const functions = useMemo(() => getFunctions(app, "us-central1"), []);
  const createTicketCallable = useMemo(
    () => httpsCallable<Record<string, unknown>, CreateTicketResponse>(functions, "createTicket"),
    [functions]
  );

  const numbers = useMemo(() => {
    const uniqueNumbers = new Set<string>();
    plays.forEach((play) => {
      const value = play.number.trim();
      if (value) uniqueNumbers.add(value);
    });
    return Array.from(uniqueNumbers);
  }, [plays]);

  const totalAmount = useMemo(
    () => plays.reduce((sum, play) => sum + Number(play.amount || 0), 0),
    [plays]
  );

  const configuredDraws = draws;
  const sellableDraws = useMemo(
    () => configuredDraws.filter((draw) => draw.isActive !== false && getDrawStatus(draw) === "open"),
    [configuredDraws]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDrawsReadyCheck(true), 1200);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (sellableDraws.length === 0) {
      if (selectedDrawId) setSelectedDrawId("");
      return;
    }

    const stillExists = sellableDraws.some((draw) => draw.id === selectedDrawId);
    if (!stillExists) {
      setSelectedDrawId(sellableDraws[0].id);
    }
  }, [sellableDraws, selectedDrawId]);

  const isDrawsLoading = !drawsReadyCheck && draws.length === 0;
  const hasNoDrawsConfigured = drawsReadyCheck && configuredDraws.length === 0;
  const hasNoDrawsAvailableForSale =
    drawsReadyCheck && configuredDraws.length > 0 && sellableDraws.length === 0;

  const addPlay = () => {
    const number = playNumberInput.trim();
    const playType = playTypeInput.trim();
    const amount = Number(playAmountInput);

    if (!number || !playType || !Number.isFinite(amount) || amount <= 0) {
      setState("error");
      setErrorMessage(
        "To add a play: number and playType are required, and amount must be greater than 0."
      );
      return;
    }

    setPlays((previous) => [...previous, { number, playType, amount }]);
    setPlayNumberInput("");
    setPlayTypeInput("");
    setPlayAmountInput("");
    if (state === "error") {
      setState("idle");
      setErrorMessage("");
    }
  };

  const removePlay = (indexToRemove: number) => {
    setPlays((previous) => previous.filter((_, index) => index !== indexToRemove));
  };

  const validateBeforeSubmit = () => {
    if (!effectiveSellerId) return "sellerId is required.";
    if (!effectiveSellerCode) return "sellerCode is required.";
    if (!customerName.trim()) return "customerName is required.";
    if (!businessDate.trim()) return "businessDate is required.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate.trim())) {
      return "businessDate must follow YYYY-MM-DD format.";
    }
    if (hasNoDrawsConfigured) return "No draws configured yet. Create draws first.";
    if (hasNoDrawsAvailableForSale) return "No draws available for sale right now.";
    if (!selectedDrawId.trim()) return "You must select a valid draw.";
    const isSelectedDrawSellable = sellableDraws.some((draw) => draw.id === selectedDrawId.trim());
    if (!isSelectedDrawSellable) {
      return "Selected draw is no longer available for sale. Choose another one.";
    }
    if (plays.length === 0) return "At least one valid play is required.";
    for (let index = 0; index < plays.length; index += 1) {
      const play = plays[index];
      if (!play.number.trim()) return `plays[${index}] number is required.`;
      if (!play.playType.trim()) return `plays[${index}] playType is required.`;
      if (!Number.isFinite(play.amount) || play.amount <= 0) {
        return `plays[${index}] amount must be greater than 0.`;
      }
    }
    if (numbers.length === 0) return "numbers could not be derived from plays.";
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return "totalAmount must be greater than 0.";
    }
    return null;
  };

  const resetAttempt = () => {
    setAttemptIdempotencyKey(null);
    setState("idle");
    setErrorMessage("");
    setResult(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setResult(null);

    try {
      const validationError = validateBeforeSubmit();
      if (validationError) {
        setState("error");
        setErrorMessage(validationError);
        return;
      }

      setState("submitting");
      const key = attemptIdempotencyKey ?? generateIdempotencyKey();
      if (!attemptIdempotencyKey) {
        setAttemptIdempotencyKey(key);
      }

      const payload = {
        idempotencyKey: key,
        sellerId: effectiveSellerId,
        sellerCode: effectiveSellerCode,
        customerName: customerName.trim(),
        businessDate: businessDate.trim(),
        drawId: selectedDrawId.trim(),
        numbers,
        plays,
        totalAmount,
      };

      const response = await createTicketCallable(payload);
      const data = response.data;
      setResult(data);

      if (data.ok && data.created === false) {
        setState("duplicate");
      } else {
        setState("success");
      }
    } catch (error) {
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  return (
    <div className="p-4 text-white h-full overflow-auto">
      <h1 className="text-lg font-bold mb-3">Ticket Create (Test)</h1>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="rounded-md border border-slate-700 p-2 text-xs text-slate-300">
          {hasTrustedSellerContext
            ? "Seller data loaded from current user context."
            : "Seller data is manual (no complete current user context detected)."}
        </div>
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="sellerId"
          value={contextSellerId || sellerId}
          onChange={(e) => setSellerId(e.target.value)}
          readOnly={Boolean(contextSellerId)}
        />
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="sellerCode"
          value={contextSellerCode || sellerCode}
          onChange={(e) => setSellerCode(e.target.value)}
          readOnly={Boolean(contextSellerCode)}
        />
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="customerName"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="businessDate (YYYY-MM-DD)"
          value={businessDate}
          onChange={(e) => setBusinessDate(e.target.value)}
        />

        <div className="rounded-md border border-slate-700 p-3 space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-300">Draw Selection</p>
          {isDrawsLoading && <p className="text-sm text-slate-400">Loading draws...</p>}
          {hasNoDrawsConfigured && (
            <p className="text-sm text-amber-300">
              No draws configured. Ask admin to create draws in Firestore.
            </p>
          )}
          {hasNoDrawsAvailableForSale && (
            <p className="text-sm text-amber-300">
              Draws exist, but none are currently available for sale.
            </p>
          )}
          {!isDrawsLoading && !hasNoDrawsConfigured && !hasNoDrawsAvailableForSale && (
            <select
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
              value={selectedDrawId}
              onChange={(e) => setSelectedDrawId(e.target.value)}
            >
              {sellableDraws.map((draw) => (
                <option key={draw.id} value={draw.id}>
                  {draw.name}
                  {draw.drawTime ? ` - ${draw.drawTime}` : ""} - open ({draw.id})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="rounded-md border border-slate-700 p-3 space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-300">Add Play</p>
          <input
            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
            placeholder="play number"
            value={playNumberInput}
            onChange={(e) => setPlayNumberInput(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
            placeholder="play type"
            value={playTypeInput}
            onChange={(e) => setPlayTypeInput(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
            placeholder="play amount"
            value={playAmountInput}
            onChange={(e) => setPlayAmountInput(e.target.value)}
          />
          <button
            type="button"
            className="rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold"
            onClick={addPlay}
          >
            Add Play
          </button>
        </div>

        <div className="rounded-md border border-slate-700 p-3 space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-300">Current Plays</p>
          {plays.length === 0 && <p className="text-sm text-slate-400">No plays added yet.</p>}
          {plays.map((play, index) => (
            <div
              key={`${play.number}-${play.playType}-${index}`}
              className="flex items-center justify-between gap-2 text-sm bg-slate-900 rounded p-2"
            >
              <span>
                #{index + 1} {play.number} | {play.playType} | {play.amount}
              </span>
              <button
                type="button"
                className="rounded bg-red-700 px-2 py-1 text-xs"
                onClick={() => removePlay(index)}
              >
                Remove
              </button>
            </div>
          ))}
          <p className="text-sm text-slate-300">
            <span className="font-semibold">numbers:</span> {numbers.length > 0 ? numbers.join(", ") : "-"}
          </p>
          <p className="text-sm text-slate-300">
            <span className="font-semibold">totalAmount:</span> {totalAmount}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-60"
            disabled={
              state === "submitting" ||
              isDrawsLoading ||
              hasNoDrawsConfigured ||
              hasNoDrawsAvailableForSale
            }
          >
            {state === "submitting" ? "Submitting..." : "Create Ticket"}
          </button>
          <button
            type="button"
            className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold"
            onClick={resetAttempt}
          >
            New Attempt
          </button>
        </div>
      </form>

      <div className="mt-4 space-y-2 text-sm">
        <p>
          <span className="font-semibold">State:</span> {state}
        </p>
        <p>
          <span className="font-semibold">idempotencyKey:</span>{" "}
          {attemptIdempotencyKey ?? "(not generated yet)"}
        </p>
      </div>

      {state === "error" && (
        <p className="mt-3 text-red-300 text-sm">Error: {errorMessage || "Request failed."}</p>
      )}

      {(state === "success" || state === "duplicate") && result && (
        <div className="mt-3 rounded-md border border-slate-700 bg-slate-900 p-3 text-sm space-y-1">
          {state === "duplicate" && (
            <p className="text-amber-300 font-semibold">
              Duplicate idempotent request detected. Existing ticket returned.
            </p>
          )}
          <p>
            <span className="font-semibold">ticketId:</span> {result.ticketId}
          </p>
          <p>
            <span className="font-semibold">ticketCode:</span> {result.ticketCode}
          </p>
          <p>
            <span className="font-semibold">status:</span> {result.status}
          </p>
          {result.message && (
            <p>
              <span className="font-semibold">message:</span> {result.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
