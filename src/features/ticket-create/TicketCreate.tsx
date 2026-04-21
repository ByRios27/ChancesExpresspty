import React, { useMemo, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/shared/lib/firebase";

type CreateState = "idle" | "submitting" | "success" | "duplicate" | "error";

type CreateTicketResponse = {
  ok: boolean;
  created: boolean;
  ticketId: string;
  ticketCode: string;
  status: string;
  message?: string;
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
  const [sellerId, setSellerId] = useState("");
  const [sellerCode, setSellerCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [businessDate, setBusinessDate] = useState(buildDefaultBusinessDate());
  const [drawId, setDrawId] = useState("");
  const [numbersInput, setNumbersInput] = useState("");
  const [playNumber, setPlayNumber] = useState("");
  const [playType, setPlayType] = useState("");
  const [playAmount, setPlayAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState("");

  const [state, setState] = useState<CreateState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [attemptIdempotencyKey, setAttemptIdempotencyKey] = useState<string | null>(null);
  const [result, setResult] = useState<CreateTicketResponse | null>(null);

  const functions = useMemo(() => getFunctions(app, "us-central1"), []);
  const createTicketCallable = useMemo(
    () => httpsCallable<Record<string, unknown>, CreateTicketResponse>(functions, "createTicket"),
    [functions]
  );

  const resetAttempt = () => {
    setAttemptIdempotencyKey(null);
    setState("idle");
    setErrorMessage("");
    setResult(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("submitting");
    setErrorMessage("");
    setResult(null);

    try {
      const numbers = numbersInput
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      const amountValue = Number(playAmount);
      const totalAmountValue = Number(totalAmount);
      const key = attemptIdempotencyKey ?? generateIdempotencyKey();
      if (!attemptIdempotencyKey) {
        setAttemptIdempotencyKey(key);
      }

      const payload = {
        idempotencyKey: key,
        sellerId: sellerId.trim(),
        sellerCode: sellerCode.trim(),
        customerName: customerName.trim(),
        businessDate: businessDate.trim(),
        drawId: drawId.trim(),
        numbers,
        plays: [
          {
            number: playNumber.trim(),
            playType: playType.trim(),
            amount: amountValue,
          },
        ],
        totalAmount: totalAmountValue,
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
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="sellerId"
          value={sellerId}
          onChange={(e) => setSellerId(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="sellerCode"
          value={sellerCode}
          onChange={(e) => setSellerCode(e.target.value)}
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
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="drawId"
          value={drawId}
          onChange={(e) => setDrawId(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="numbers (comma separated)"
          value={numbersInput}
          onChange={(e) => setNumbersInput(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="play number"
          value={playNumber}
          onChange={(e) => setPlayNumber(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="play type"
          value={playType}
          onChange={(e) => setPlayType(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="play amount"
          value={playAmount}
          onChange={(e) => setPlayAmount(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          placeholder="totalAmount"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-60"
            disabled={state === "submitting"}
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
