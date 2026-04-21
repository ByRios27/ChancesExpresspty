import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import type { Ticket } from "@/entities/ticket";
import { db } from "@/shared/lib/firebase";

const TICKETS_COLLECTION = "tickets";

function toTicket(id: string, data: Record<string, unknown>): Ticket {
  return {
    id,
    ticketCode: (data.ticketCode as string) ?? "",
    idempotencyKey: (data.idempotencyKey as string) ?? "",
    sellerId: (data.sellerId as string) ?? "",
    sellerCode: (data.sellerCode as string) ?? "",
    customerName: (data.customerName as string) ?? "",
    businessDate: (data.businessDate as string) ?? "",
    drawId: (data.drawId as string) ?? "",
    numbers: (data.numbers as string[]) ?? [],
    plays: (data.plays as Ticket["plays"]) ?? [],
    totalAmount: (data.totalAmount as number) ?? 0,
    status: (data.status as Ticket["status"]) ?? "active",
    createdAt: (data.createdAt as Ticket["createdAt"]) ?? null,
    updatedAt: (data.updatedAt as Ticket["updatedAt"]) ?? null,
  };
}

async function getTicketById(id: string): Promise<Ticket | null> {
  const ticketRef = doc(db, TICKETS_COLLECTION, id);
  const snapshot = await getDoc(ticketRef);

  if (!snapshot.exists()) {
    return null;
  }

  return toTicket(snapshot.id, snapshot.data() as Record<string, unknown>);
}

async function getTicketByCode(ticketCode: string): Promise<Ticket | null> {
  const ticketsRef = collection(db, TICKETS_COLLECTION);
  const ticketsQuery = query(ticketsRef, where("ticketCode", "==", ticketCode), limit(1));
  const snapshot = await getDocs(ticketsQuery);

  if (snapshot.empty) {
    return null;
  }

  const ticketDoc = snapshot.docs[0];
  return toTicket(ticketDoc.id, ticketDoc.data() as Record<string, unknown>);
}

async function listTicketsBySellerAndDate(
  sellerCode: string,
  businessDate: string
): Promise<Ticket[]> {
  const ticketsRef = collection(db, TICKETS_COLLECTION);
  const ticketsQuery = query(
    ticketsRef,
    where("sellerCode", "==", sellerCode),
    where("businessDate", "==", businessDate)
  );
  const snapshot = await getDocs(ticketsQuery);

  return snapshot.docs.map((ticketDoc) =>
    toTicket(ticketDoc.id, ticketDoc.data() as Record<string, unknown>)
  );
}

export const ticketRepository = {
  getTicketById,
  getTicketByCode,
  listTicketsBySellerAndDate,
};
