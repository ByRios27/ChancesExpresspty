import React, { useState } from "react";
import { ticketRepository } from "@/shared/api/ticketRepository";
import type { Ticket } from "@/entities/ticket";

type SearchState = "idle" | "loading" | "found" | "not_found" | "error";

export default function TicketSearch() {
  const [ticketCode, setTicketCode] = useState("");
  const [state, setState] = useState<SearchState>("idle");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSearch = async () => {
    const trimmedCode = ticketCode.trim();
    if (!trimmedCode) {
      setState("idle");
      setTicket(null);
      setErrorMessage("");
      return;
    }

    setState("loading");
    setTicket(null);
    setErrorMessage("");

    try {
      const result = await ticketRepository.getTicketByCode(trimmedCode);
      if (!result) {
        setState("not_found");
        return;
      }

      setTicket(result);
      setState("found");
    } catch (error) {
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  };

  return (
    <div className="p-4 text-white h-full overflow-auto">
      <h1 className="text-lg font-bold mb-3">Ticket Search (Test)</h1>

      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          value={ticketCode}
          onChange={(event) => setTicketCode(event.target.value)}
          placeholder="Enter ticketCode"
        />
        <button
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-60"
          onClick={handleSearch}
          disabled={state === "loading"}
        >
          {state === "loading" ? "Searching..." : "Search"}
        </button>
      </div>

      {state === "idle" && (
        <p className="text-slate-300 text-sm">Type a ticketCode and run search.</p>
      )}

      {state === "loading" && <p className="text-slate-300 text-sm">Loading...</p>}

      {state === "not_found" && (
        <p className="text-amber-300 text-sm">Ticket not found for that code.</p>
      )}

      {state === "error" && (
        <p className="text-red-300 text-sm">Error: {errorMessage || "Search failed."}</p>
      )}

      {state === "found" && ticket && (
        <div className="rounded-md border border-slate-700 bg-slate-900 p-3 text-sm space-y-1">
          <p><span className="font-semibold">ticketCode:</span> {ticket.ticketCode || "-"}</p>
          <p><span className="font-semibold">sellerCode:</span> {ticket.sellerCode || "-"}</p>
          <p><span className="font-semibold">customerName:</span> {ticket.customerName || "-"}</p>
          <p><span className="font-semibold">businessDate:</span> {ticket.businessDate || "-"}</p>
          <p><span className="font-semibold">drawId:</span> {ticket.drawId || "-"}</p>
          <p><span className="font-semibold">totalAmount:</span> {ticket.totalAmount ?? 0}</p>
          <p><span className="font-semibold">status:</span> {ticket.status || "-"}</p>
          <p>
            <span className="font-semibold">numbers:</span>{" "}
            {Array.isArray(ticket.numbers) && ticket.numbers.length > 0
              ? ticket.numbers.join(", ")
              : "-"}
          </p>
        </div>
      )}
    </div>
  );
}
