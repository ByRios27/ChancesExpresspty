import type { AppSettings, Draw, Entry, Ticket } from '../store/useStore';
import { calculateEntryPrize } from './prizeCalculator';

export type TicketEntryMode = 'copy' | 'manual';

export interface DrawEntryGroup {
  drawId: string;
  drawName: string;
  entries: Entry[];
  subtotal: number;
}

const cloneEntries = (entries: Entry[] = []): Entry[] => entries.map((entry) => ({ ...entry }));

const computeSubtotal = (entries: Entry[] = []): number =>
  Number(entries.reduce((sum, entry) => sum + entry.amount, 0).toFixed(2));

export function buildDrawEntries(
  drawIds: string[],
  drawNames: string[],
  entryMap: Record<string, Entry[]>,
): DrawEntryGroup[] {
  console.log('building drawEntries');

  return drawIds.map((drawId, index) => {
    const entries = cloneEntries(entryMap[drawId] || []);
    return {
      drawId,
      drawName: drawNames[index] || 'Sorteo',
      entries,
      subtotal: computeSubtotal(entries),
    };
  });
}

export function normalizeTicketDrawEntries(ticket: Partial<Ticket>): DrawEntryGroup[] {
  if (ticket.drawEntries && ticket.drawEntries.length > 0) {
    return ticket.drawEntries.map((group) => ({
      drawId: group.drawId,
      drawName: group.drawName,
      entries: cloneEntries(group.entries),
      subtotal: group.subtotal ?? computeSubtotal(group.entries),
    }));
  }

  const drawIds = ticket.drawIds || [];
  const drawNames = ticket.drawNames || [];
  const legacyEntries = cloneEntries(ticket.entries || []);

  if (legacyEntries.length > 0 && drawIds.length > 0) {
    console.log('normalized legacy ticket entries');
    return drawIds.map((drawId, index) => ({
      drawId,
      drawName: drawNames[index] || 'Sorteo',
      entries: cloneEntries(legacyEntries),
      subtotal: computeSubtotal(legacyEntries),
    }));
  }

  return [];
}

export function getEntriesForDraw(ticket: Partial<Ticket>, drawId: string): Entry[] {
  const group = normalizeTicketDrawEntries(ticket).find((item) => item.drawId === drawId);
  return group ? cloneEntries(group.entries) : [];
}

export function getNormalizedDrawGroup(ticket: Partial<Ticket>, drawId: string): DrawEntryGroup | undefined {
  console.log('normalized draw groups for payout', ticket.id, drawId);
  const group = normalizeTicketDrawEntries(ticket).find((item) => item.drawId === drawId);
  if (group) {
    console.log('matched draw group', drawId);
  }
  return group
    ? {
        ...group,
        entries: cloneEntries(group.entries),
        subtotal: group.subtotal ?? computeSubtotal(group.entries),
      }
    : undefined;
}

export function getTicketFlatEntries(ticket: Partial<Ticket>): Entry[] {
  const drawEntries = normalizeTicketDrawEntries(ticket);
  if (drawEntries.length === 0) {
    return cloneEntries(ticket.entries || []);
  }

  const grouped = new Map<string, Entry>();
  drawEntries.forEach((group) => {
    group.entries.forEach((entry) => {
      const key = `${entry.type}:${entry.number}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.amount = Number((existing.amount + entry.amount).toFixed(2));
        existing.pieces += entry.pieces;
        existing.prize = (existing.prize || 0) + (entry.prize || 0);
      } else {
        grouped.set(key, { ...entry });
      }
    });
  });

  return Array.from(grouped.values());
}

export function getTicketSubtotalForDraw(ticket: Partial<Ticket>, drawId: string): number {
  const group = getNormalizedDrawGroup(ticket, drawId);
  if (group) {
    return group.subtotal ?? computeSubtotal(group.entries);
  }

  const drawCount = ticket.drawIds?.length || 1;
  return Number(((ticket.total || 0) / drawCount).toFixed(2));
}

export function calculateTicketSalesForDraw(ticket: Partial<Ticket>, drawId: string): number {
  console.log('evaluating ticket for draw', ticket.id, drawId);
  return getTicketSubtotalForDraw(ticket, drawId);
}

export function getWinningEntriesForDraw(ticket: Partial<Ticket>, draw: Draw, settings: AppSettings): Entry[] {
  const group = getNormalizedDrawGroup(ticket, draw.id);
  if (!group) {
    return [];
  }

  return group.entries
    .map((entry) => {
      const { prize, winningPosition } = calculateEntryPrize(entry, draw, settings);
      return {
        ...entry,
        prize,
        winningPosition,
        status: prize > 0 ? 'winner' : 'loser',
      } as Entry;
    })
    .filter((entry) => (entry.prize || 0) > 0);
}

export function calculateTicketPayoutForDraw(ticket: Partial<Ticket>, draw: Draw, settings: AppSettings): number {
  console.log('evaluating ticket for draw', ticket.id, draw.id);
  const group = getNormalizedDrawGroup(ticket, draw.id);
  if (!group) {
    return 0;
  }

  const payout = group.entries.reduce((sum, entry) => {
    const { prize } = calculateEntryPrize(entry, draw, settings);
    return sum + prize;
  }, 0);

  console.log('calculated payout for draw', draw.id, payout);
  return payout;
}

export function getTicketEntryMode(ticket: Partial<Ticket>): TicketEntryMode {
  const drawEntries = normalizeTicketDrawEntries(ticket);
  if (drawEntries.length <= 1) {
    return 'copy';
  }

  const base = JSON.stringify(drawEntries[0].entries || []);
  const isCopyMode = drawEntries.every((group) => JSON.stringify(group.entries || []) === base);
  return isCopyMode ? 'copy' : 'manual';
}

export function cloneDrawEntryMap(drawEntries: DrawEntryGroup[]): Record<string, Entry[]> {
  return drawEntries.reduce<Record<string, Entry[]>>((acc, group) => {
    acc[group.drawId] = cloneEntries(group.entries);
    return acc;
  }, {});
}
