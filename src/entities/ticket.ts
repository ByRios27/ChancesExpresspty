import type { Timestamp } from "firebase/firestore";

export type TicketStatus = "active" | "voided" | "claimed" | "expired" | "archived";

export type TicketPlay = {
  number: string;
  amount: number;
  playType: string;
};

export type Ticket = {
  id: string;
  ticketCode: string;
  idempotencyKey: string;
  sellerId: string;
  sellerCode: string;
  customerName: string;
  businessDate: string;
  drawId: string;
  numbers: string[];
  plays: TicketPlay[];
  totalAmount: number;
  status: TicketStatus;
  createdAt: Timestamp | Date | number | string | null;
  updatedAt: Timestamp | Date | number | string | null;
};
