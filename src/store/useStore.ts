import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { releaseTicketLimits } from '../services/betService';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, deleteField, getDocFromCache, getDocFromServer, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { calculateEntryPrize } from '../utils/prizeCalculator';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { generateSellerId } from '../utils/helpers';
import type { DrawEntryGroup } from '../utils/ticketUtils';
import { getTicketFlatEntries, normalizeTicketDrawEntries } from '../utils/ticketUtils';

export type DrawStatus = 'open' | 'closed' | 'inactive';

export interface Draw {
  id: string;
  name: string;
  drawTime: string;
  drawTimeSort?: number;
  closeTime: string;
  closeTimeSort?: number;
  digitsMode: 2 | 4;
  allowedSpecialBets: {
    pale: boolean;
    billete: boolean;
  };
  isActive: boolean;
  results?: string[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

export type GameType = 'CHANCE' | 'PALÉ' | 'BILLETE';

export interface Entry {
  id?: string;
  number: string;
  amount: number;
  pieces: number; // Cantidad (tiempos)
  type: GameType;
  prize?: number;
  status?: 'pending' | 'winner' | 'loser';
  winningPosition?: '1er' | '2do' | '3er';
}

export interface Ticket {
  id: string;
  userId?: string;
  drawId?: string;
  drawIds: string[];
  drawNames: string[];
  entryTypes?: GameType[];
  hasResults?: boolean;
  isWinner?: boolean;
  drawEntries?: DrawEntryGroup[];
  entries: Entry[];
  total: number;
  timestamp: number;
  isPaid?: boolean;
  totalPrize?: number;
  customerName: string;
  sequenceNumber: number;
  sellerName: string;
  sellerId?: string;
  commission: number;
  commissionRateApplied: number;
}

export interface PaleSettings {
  enabled: boolean;
  minAmount: number;
  maxAmountPerPlay: number;
  globalLimitPerCombination: number;
  payouts: {
    firstSecond: number;
    firstThird: number;
    secondThird: number;
  };
}

export interface BilletePayouts {
  exact4: number;
  exact3PrefixOrSuffix: number;
  exact2PrefixOrSuffix: number;
}

export interface BilleteSettings {
  enabled: boolean;
  unitPrice: number;
  globalLimitPerNumber: number;
  payouts: {
    firstPrize: BilletePayouts;
    secondPrize: BilletePayouts;
    thirdPrize: BilletePayouts;
  };
}

export interface ChanceSettings {
  payouts: {
    first: number;
    second: number;
    third: number;
  };
}

export interface AppSettings {
  pricePerTime: number;
  commissionRate: number; // e.g., 0.2 for 20%
  chance: ChanceSettings;
  pale: PaleSettings;
  billete: BilleteSettings;
}

export type UserRole = 'CEO' | 'VENDEDOR' | 'USUARIO';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: UserRole;
  status: 'active' | 'inactive';
  commission: number;
  sellerId?: string;
  pin?: string;
  capitalInjection?: number;
}

export interface SpecialPlay {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  rule: string;
  type: string;
}

export type Page = 'sales' | 'history' | 'stats' | 'settings' | 'results' | 'winners' | 'closures' | 'settlement' | 'userSettings' | 'archive';

interface AppState {
  draws: Draw[];
  tickets: Ticket[];
  isTicketsRefreshing: boolean;
  lastTicketsSyncAt: number | null;
  ticketsOwnerId: string | null;
  lastSelectedDrawId: string | null;
  users: User[];
  currentUser: User | null;
  settings: AppSettings;
  nextTicketSequence: number;
  currentPage: Page;
  
  // Actions
  addDraw: (draw: Draw) => void;
  updateDraw: (id: string, draw: Partial<Draw>) => void;
  deleteDraw: (id: string) => void;
  
  addTicket: (ticket: Ticket) => Promise<Ticket>;
  updateTicket: (id: string, ticket: Partial<Ticket>) => Promise<Ticket>;
  deleteTicket: (id: string) => Promise<void>;
  incrementSequence: () => void;
  
  addUser: (user: User) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  setCurrentUser: (user: User | null) => void;

  updateSettings: (settings: Partial<AppSettings>) => void;
  setCurrentPage: (page: Page) => void;
  setLastSelectedDrawId: (drawId: string | null) => void;
  
  // Reuse & Edit logic
  reusedTicket: Ticket | null;
  setReusedTicket: (ticket: Ticket | null) => void;
  editingTicket: Ticket | null;
  setEditingTicket: (ticket: Ticket | null) => void;
  
  // Results Actions
  setResults: (drawId: string, results: string[]) => Promise<void>;
  removeResults: (drawId: string) => Promise<void>;
  recalculatePrizes: (ticketIds?: string[]) => void;
  resetSalesData: () => Promise<void>;
  archiveTickets: () => Promise<void>;
  getGlobalStats: () => { totalSales: number; totalCommission: number; totalPrizes: number; totalCapitalInjection: number; utility: number };
}

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
    // Skip logging for other errors, as this is simply a connection test.
  }
}
testConnection();

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      draws: [],
      tickets: [],
      isTicketsRefreshing: false,
      lastTicketsSyncAt: null,
      ticketsOwnerId: null,
      lastSelectedDrawId: null,
      users: [],
      currentUser: null,
      settings: {
        pricePerTime: 1,
        commissionRate: 0.2,
        chance: {
          payouts: {
            first: 60,
            second: 8,
            third: 4
          }
        },
        pale: {
          enabled: true,
          minAmount: 0.10,
          maxAmountPerPlay: 5.00,
          globalLimitPerCombination: 5.00,
          payouts: {
            firstSecond: 1000,
            firstThird: 1000,
            secondThird: 200
          }
        },
        billete: {
          enabled: true,
          unitPrice: 1.00,
          globalLimitPerNumber: 5,
          payouts: {
            firstPrize: { exact4: 2000, exact3PrefixOrSuffix: 50, exact2PrefixOrSuffix: 3 },
            secondPrize: { exact4: 600, exact3PrefixOrSuffix: 20, exact2PrefixOrSuffix: 2 },
            thirdPrize: { exact4: 300, exact3PrefixOrSuffix: 10, exact2PrefixOrSuffix: 1 }
          }
        }
      },
      nextTicketSequence: 1,
      currentPage: 'sales',
      reusedTicket: null,
      editingTicket: null,
      setReusedTicket: (ticket) => set({ reusedTicket: ticket }),
      setEditingTicket: (ticket) => set({ editingTicket: ticket }),
      
      addDraw: (draw) => {
        if (auth.currentUser) {
          setDoc(doc(db, 'draws', draw.id), draw).catch(err => handleFirestoreError(err, OperationType.WRITE, `draws/${draw.id}`));
        }
        set((state) => ({ draws: [...state.draws, draw] }));
      },
      updateDraw: (id, updatedDraw) => {
        if (auth.currentUser) {
          updateDoc(doc(db, 'draws', id), updatedDraw as any).catch(err => handleFirestoreError(err, OperationType.UPDATE, `draws/${id}`));
        }
        set((state) => ({
          draws: state.draws.map((d) => (d.id === id ? { ...d, ...updatedDraw } : d)),
        }));
      },
      deleteDraw: (id) => {
        if (auth.currentUser) {
          deleteDoc(doc(db, 'draws', id)).catch(err => handleFirestoreError(err, OperationType.DELETE, `draws/${id}`));
        }
        set((state) => ({
          draws: state.draws.filter((d) => d.id !== id),
        }));
      },
      
      addTicket: async (ticket) => {
        const { currentUser, settings } = get();
        
        if (!currentUser?.id) {
          throw new Error('Usuario sin ID, no se puede generar ticket');
        }

        const normalizedDrawEntries = normalizeTicketDrawEntries(ticket);
        const sourceEntries = normalizedDrawEntries.length > 0
          ? normalizedDrawEntries.flatMap((group) => group.entries)
          : ticket.entries;

        // Accumulate entries with same number and type
        const accumulatedEntries: Entry[] = [];
        sourceEntries.forEach(entry => {
          const existing = accumulatedEntries.find(e => e.number === entry.number && e.type === entry.type);
          if (existing) {
            existing.amount += entry.amount;
            existing.pieces += entry.pieces;
          } else {
            accumulatedEntries.push({ ...entry });
          }
        });
        
        const rate = typeof ticket.commissionRateApplied === 'number'
          ? ticket.commissionRateApplied
          : (currentUser?.commission ?? settings.commissionRate);
        const total = normalizedDrawEntries.length > 0
          ? Number(normalizedDrawEntries.reduce((sum, group) => sum + group.subtotal, 0).toFixed(2))
          : accumulatedEntries.reduce((sum, e) => sum + e.amount, 0) * (ticket.drawIds?.length || 1);
        const commission = Number((total * rate).toFixed(2));

        const finalTicket: Ticket = {
          ...ticket,
          userId: auth.currentUser?.uid,
          drawId: ticket.drawIds?.[0],
          entryTypes: Array.from(new Set(accumulatedEntries.map((entry) => entry.type))),
          hasResults: false,
          isWinner: false,
          sellerId: currentUser.sellerId,
          drawEntries: normalizedDrawEntries,
          entries: accumulatedEntries,
          total,
          commission,
          commissionRateApplied: rate
        };
        
        if (auth.currentUser) {
          console.log('saving ticket...', finalTicket.id);
          try {
            await setDoc(doc(db, 'tickets', finalTicket.id), finalTicket);
            console.log('ticket saved', finalTicket.id);
          } catch (err) {
            console.error('ticket save failed', err);
            handleFirestoreError(err, OperationType.WRITE, `tickets/${finalTicket.id}`);
            throw err;
          }
        }

        set((state) => {
          const dedupedTickets = state.tickets.filter((t) => t.id !== finalTicket.id);
          return {
            tickets: [finalTicket, ...dedupedTickets].sort((a, b) => b.timestamp - a.timestamp),
          };
        });
        return finalTicket;
      },
      updateTicket: async (id, updatedTicket) => {
        const existingTicket = get().tickets.find((t) => t.id === id);
        if (!existingTicket) {
          throw new Error(`Ticket no encontrado: ${id}`);
        }

        const mergedTicket = { ...existingTicket, ...updatedTicket };
        const normalizedDrawEntries = normalizeTicketDrawEntries(mergedTicket);
        const rate = typeof mergedTicket.commissionRateApplied === 'number'
          ? mergedTicket.commissionRateApplied
          : (get().currentUser?.commission ?? get().settings.commissionRate);
        const total = typeof mergedTicket.total === 'number' ? mergedTicket.total : 0;
        const finalTicket: Ticket = {
          ...mergedTicket,
          drawId: mergedTicket.drawIds?.[0],
          entryTypes: Array.from(new Set(getTicketFlatEntries(mergedTicket).map((entry) => entry.type))),
          drawEntries: normalizedDrawEntries,
          entries: getTicketFlatEntries(mergedTicket),
          commissionRateApplied: rate,
          commission: Number((total * rate).toFixed(2)),
        };

        if (auth.currentUser) {
          console.log('updating ticket...', id);
          try {
            await updateDoc(doc(db, 'tickets', id), updatedTicket as any);
            console.log('ticket updated', id);
          } catch (err) {
            console.error('ticket update failed', err);
            handleFirestoreError(err, OperationType.UPDATE, `tickets/${id}`);
            throw err;
          }
        }
        set((state) => ({
          tickets: state.tickets.map((t) => (t.id === id ? finalTicket : t)),
        }));
        return finalTicket;
      },
      deleteTicket: async (id) => {
        const ticketToDelete = get().tickets.find(t => t.id === id);
        if (!ticketToDelete) return;
        try {
          await releaseTicketLimits(ticketToDelete, get().settings);

          if (auth.currentUser) {
            await deleteDoc(doc(db, 'tickets', id));
          }

          set((state) => ({
            tickets: state.tickets.filter((t) => t.id !== id),
          }));
          return;
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `tickets/${id}`);
          throw err;
        }
        /* set((state) => {
          const ticketToDelete = state.tickets.find(t => t.id === id);
          if (ticketToDelete) {
            ticketToDelete.entries.forEach(entry => {
              if (entry.type === 'PALÉ') {
                releasePaleLimit(entry.number, entry.amount);
              } else if (entry.type === 'BILLETE') {
                const billeteSettings = state.settings.billete || { unitPrice: 1.00 };
                const units = Math.round(entry.amount / billeteSettings.unitPrice);
                releaseBilleteLimit(entry.number, units);
              }
            });
          }
          return {
            tickets: state.tickets.filter((t) => t.id !== id),
          };
        }); */
      },
      incrementSequence: () => set((state) => ({ nextTicketSequence: state.nextTicketSequence + 1 })),
      
      addUser: (user) => {
        const sellerId = user.sellerId || generateSellerId();
        const newUser = { ...user, sellerId };
        if (auth.currentUser) {
          setDoc(doc(db, 'users', newUser.id), newUser).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${newUser.id}`));
        }
        set((state) => ({ users: [...state.users, newUser] }));
      },
      updateUser: (id, updatedUser) => {
        if (auth.currentUser) {
          updateDoc(doc(db, 'users', id), updatedUser as any).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${id}`));
        }
        set((state) => {
          const newUsers = state.users.map((u) => (u.id === id ? { ...u, ...updatedUser } : u));
          const isCurrentUser = state.currentUser?.id === id;
          return {
            users: newUsers,
            currentUser: isCurrentUser ? { ...state.currentUser!, ...updatedUser } : state.currentUser
          };
        });
      },
      deleteUser: (id) => {
        if (auth.currentUser) {
          deleteDoc(doc(db, 'users', id)).catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${id}`));
        }
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
        }));
      },
      setCurrentUser: (user) => set({ currentUser: user }),

      updateSettings: (newSettings) => {
        if (auth.currentUser) {
          // Update individual settings in Firestore
          if (newSettings.pale) {
            setDoc(doc(db, 'gameSettings', 'pale'), newSettings.pale).catch(err => handleFirestoreError(err, OperationType.WRITE, 'gameSettings/pale'));
          }
          if (newSettings.billete) {
            setDoc(doc(db, 'gameSettings', 'billete'), newSettings.billete).catch(err => handleFirestoreError(err, OperationType.WRITE, 'gameSettings/billete'));
          }
          // For other general settings, we could have a 'general' doc
          const { pale, billete, ...general } = newSettings;
          if (Object.keys(general).length > 0) {
            setDoc(doc(db, 'gameSettings', 'general'), general, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, 'gameSettings/general'));
          }
        }
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },
      setCurrentPage: (page) => set({ currentPage: page }),
      setLastSelectedDrawId: (drawId) => set({ lastSelectedDrawId: drawId }),

      setResults: async (drawId, results) => {
        if (!auth.currentUser) {
          throw new Error('No authenticated user');
        }

        try {
          await updateDoc(doc(db, 'draws', drawId), { results });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `draws/${drawId}`);
        }

        set((state) => {
          const updatedDraws = state.draws.map((d) => (d.id === drawId ? { ...d, results } : d));
          return { draws: updatedDraws };
        });
        get().recalculatePrizes();
      },

      removeResults: async (drawId) => {
        if (!auth.currentUser) {
          throw new Error('No authenticated user');
        }

        try {
          await updateDoc(doc(db, 'draws', drawId), { results: deleteField() });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `draws/${drawId}`);
        }

        set((state) => {
          const updatedDraws = state.draws.map((d) => {
            if (d.id === drawId) {
              const { results, ...rest } = d;
              return rest;
            }
            return d;
          });
          return { draws: updatedDraws };
        });
        get().recalculatePrizes();
      },

      recalculatePrizes: (ticketIds) => {
        set((state) => {
          const shouldRecalculateAll = !ticketIds || ticketIds.length === 0;
          const targetTicketIds = shouldRecalculateAll ? null : new Set(ticketIds);
          const drawMap = new Map(state.draws.map((draw) => [draw.id, draw]));

          const updatedTickets = state.tickets.map(ticket => {
            if (!shouldRecalculateAll && !targetTicketIds?.has(ticket.id)) {
              return ticket;
            }

            let totalPrize = 0;
            const updatedDrawEntries = normalizeTicketDrawEntries(ticket).map(group => {
              const draw = drawMap.get(group.drawId);
              const updatedEntries = group.entries.map(entry => {
                let entryPrize = 0;
                let winningPosition: '1er' | '2do' | '3er' | undefined = undefined;
                let status: 'pending' | 'winner' | 'loser' = 'pending';

                if (draw && draw.results && draw.results.length === 3) {
                  const { prize: currentDrawPrize, winningPosition: currentWinningPosition } = calculateEntryPrize(entry, draw, state.settings);

                  if (currentDrawPrize > 0) {
                    entryPrize += currentDrawPrize;
                    status = 'winner';
                    if (!winningPosition) winningPosition = currentWinningPosition;
                  } else {
                    status = 'loser';
                  }
                }

                totalPrize += entryPrize;
                return { ...entry, prize: entryPrize, status, winningPosition };
              });
              return {
                ...group,
                entries: updatedEntries,
                subtotal: Number(updatedEntries.reduce((sum, entry) => sum + entry.amount, 0).toFixed(2)),
              };
            });

            return {
              ...ticket,
              drawId: ticket.drawIds?.[0],
              hasResults: updatedDrawEntries.some((group) => {
                const draw = drawMap.get(group.drawId);
                return !!(draw?.results && draw.results.length === 3);
              }),
              isWinner: totalPrize > 0,
              drawEntries: updatedDrawEntries,
              entries: getTicketFlatEntries({ ...ticket, drawEntries: updatedDrawEntries }),
              totalPrize,
            };
          });

          return { tickets: updatedTickets };
        });
      },

      resetSalesData: async () => {
        if (!auth.currentUser) return;
        
        try {
          const { tickets, draws, users, currentUser } = get();
          
          // 1. Delete all tickets from Firestore
          const ticketPromises = tickets.map(t => deleteDoc(doc(db, 'tickets', t.id)));
          
          // 2. Clear results from all draws in Firestore
          const drawPromises = draws.map(d => updateDoc(doc(db, 'draws', d.id), { results: deleteField() }));

          // 3. Reset capital injections for all known users
          const userIds = new Set<string>(users.map((u) => u.id).filter(Boolean));
          if (currentUser?.id) userIds.add(currentUser.id);
          const resetInjectionPromises = Array.from(userIds).map((userId: string) =>
            updateDoc(doc(db, 'users', userId), { capitalInjection: 0 }).catch(async () => {
              // If document doesn't exist for any reason, create/merge the field.
              await setDoc(doc(db, 'users', userId), { capitalInjection: 0 }, { merge: true });
            })
          );

          // 4. Clear any historical control docs (limits removed, but collection may still have legacy entries)
          const betsControlSnapshot = await getDocs(collection(db, 'betsControl'));
          const batchSize = 450;
          const betControlDocs = betsControlSnapshot.docs;
          const deleteBetControlPromises: Promise<void>[] = [];

          for (let i = 0; i < betControlDocs.length; i += batchSize) {
            const chunk = betControlDocs.slice(i, i + batchSize);
            const batch = writeBatch(db);
            chunk.forEach((docSnap) => batch.delete(docSnap.ref));
            deleteBetControlPromises.push(batch.commit());
          }
          
          await Promise.all([
            ...ticketPromises,
            ...drawPromises,
            ...resetInjectionPromises,
            ...deleteBetControlPromises,
          ]);
          
          // 5. Update local state
          set({
            tickets: [],
            draws: draws.map(d => {
              const { results, ...rest } = d;
              return rest;
            }),
            users: users.map((u) => ({ ...u, capitalInjection: 0 })),
            currentUser: currentUser ? { ...currentUser, capitalInjection: 0 } : null,
          });
        } catch (error) {
          console.error('Error resetting sales data:', error);
          throw error;
        }
      },

      archiveTickets: async () => {
        if (!auth.currentUser) return;
        
        try {
          const { tickets, users, currentUser } = get();

          const businessDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Panama',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date());

          const totalSales = tickets.reduce((sum, t) => sum + (t.total || 0), 0);
          const totalCommission = Number(
            tickets.reduce((sum, t) => sum + (t.commission || 0), 0).toFixed(2)
          );
          const totalPrizes = tickets.reduce((sum, t) => sum + (t.totalPrize || 0), 0);
          const totalCapitalInjection = users.reduce((sum, u) => sum + (u.capitalInjection || 0), 0);
          const totalUtility = Number(
            (totalSales - totalCommission - totalPrizes + totalCapitalInjection).toFixed(2)
          );

          const summaryDoc = {
            businessDate,
            timezone: 'America/Panama',
            sourceVersion: 'manual-v2',
            manualArchive: true,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser?.id || auth.currentUser.uid,
            totals: {
              totalSales,
              totalCommission,
              totalPrizes,
              totalUtility,
              totalCapitalInjection,
              totalTickets: tickets.length,
            },
          };

          // Same-day archive is overwritten with the latest saved snapshot.
          await setDoc(doc(db, 'archivesDaily', businessDate), summaryDoc, { merge: true });
        } catch (error) {
          console.error('Error archiving tickets:', error);
          throw error;
        }
      },

      getGlobalStats: () => {
        const { tickets, users } = get();
        const totalSales = tickets.reduce((sum, t) => sum + t.total, 0);
        
        const totalCommission = Number(tickets.reduce((sum, t) => {
          // Use historical commission stored in ticket
          return sum + (t.commission || 0);
        }, 0).toFixed(2));

        const totalPrizes = tickets.reduce((sum, t) => sum + (t.totalPrize || 0), 0);
        
        const totalCapitalInjection = users.reduce((sum, u) => sum + (u.capitalInjection || 0), 0);

        // Utility Base = Total Sales - Total Commission
        const utilityBase = totalSales - totalCommission;
        // Utility Final = Utility Base - Total Prizes + Capital Injection
        // (Prizes are deducted from utility, commission is untouched, injections are added)
        const utility = Number((utilityBase - totalPrizes + totalCapitalInjection).toFixed(2));

        return {
          totalSales,
          totalCommission,
          totalPrizes,
          totalCapitalInjection,
          utility
        };
      },
    }),
    {
      name: 'lottopro-storage',
      partialize: (state) => ({ 
        draws: state.draws,
        tickets: state.tickets.slice(0, 600),
        users: state.users,
        settings: state.settings,
        nextTicketSequence: state.nextTicketSequence,
        currentPage: state.currentPage,
        currentUser: state.currentUser,
        lastTicketsSyncAt: state.lastTicketsSyncAt,
        ticketsOwnerId: state.ticketsOwnerId,
        lastSelectedDrawId: state.lastSelectedDrawId
      }),
      merge: (persistedState: any, currentState: AppState) => {
        if (!persistedState) return currentState;
        const { draws, tickets, users, ...rest } = persistedState;
        
        return {
          ...currentState,
          draws: Array.isArray(draws) ? draws : currentState.draws,
          tickets: Array.isArray(tickets) ? tickets : currentState.tickets,
          users: Array.isArray(users) ? users : currentState.users,
          ...rest,
          settings: {
            ...currentState.settings,
            ...(rest.settings || {}),
            pale: {
              ...currentState.settings.pale,
              ...(rest.settings?.pale || {})
            },
            billete: {
              ...currentState.settings.billete,
              ...(rest.settings?.billete || {})
            }
          }
        };
      }
    }
  )
);

