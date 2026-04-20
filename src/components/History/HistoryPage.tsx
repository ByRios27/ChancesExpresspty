import React, { useEffect, useMemo, useState } from 'react';
import { useStore, Ticket } from '../../store/useStore';
import { HistoryFilters, FilterType } from './HistoryFilters';
import { DrawHistoryCard } from './DrawHistoryCard';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart3, Share2, Layers, Check, X, Loader2 } from 'lucide-react';
import { TicketModal } from '../TicketModal';
import { sortDrawsByTime, getDrawStatus, getCustomerDisplayName } from '../../utils/helpers';
import { PullToRefresh } from '../PullToRefresh';
import {
  calculateTicketPayoutForDraw,
  calculateTicketSalesForDraw,
  getEntriesForDraw,
  getTicketSubtotalForDraw,
  normalizeTicketDrawEntries,
} from '../../utils/ticketUtils';

interface ShareOptionsProps {
  ticket: Ticket;
  onClose: () => void;
  onSelect: (ticket: Ticket) => void;
}

interface DrawHistoryItem {
  id: string;
  name: string;
  drawTime: string;
  closeTimeSort?: number;
  digitsMode: number;
  status: 'open' | 'closed';
  totalSold: number;
  totalPrizes: number;
  tickets: Ticket[];
  results?: string[];
  isActive: boolean;
}

const ShareOptionsModal: React.FC<ShareOptionsProps> = ({ ticket, onClose, onSelect }) => {
  const [view, setView] = useState<'options' | 'select-draw'>('options');

  const handleShareFull = () => {
    onSelect(ticket);
  };

  const handleShareIndividual = (index: number) => {
    const drawId = ticket.drawIds[index];
    const drawName = ticket.drawNames[index];
    const individualTicket: Ticket = {
      ...ticket,
      drawIds: [drawId],
      drawNames: [drawName],
      drawEntries: normalizeTicketDrawEntries(ticket).filter((group) => group.drawId === drawId),
      entries: getEntriesForDraw(ticket, drawId),
      total: getTicketSubtotalForDraw(ticket, drawId),
    };
    onSelect(individualTicket);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#121A2B] w-full max-w-xs rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Opciones de Compartido</h3>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {view === 'options' ? (
            <div className="space-y-3">
              <button
                onClick={handleShareFull}
                className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 active:scale-95 transition-transform"
              >
                <Layers size={16} />
                Compartir Ticket Completo
              </button>
              <button
                onClick={() => setView('select-draw')}
                className="w-full bg-white/5 text-slate-300 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 active:bg-white/10 transition-colors"
              >
                <Share2 size={16} />
                Compartir por Sorteo
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Seleccione un sorteo:</p>
              <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                {ticket.drawNames.map((name, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleShareIndividual(idx)}
                    className="w-full bg-white/5 p-4 rounded-xl flex items-center justify-between border border-white/5 active:bg-brand-primary/10 active:border-brand-primary/30 transition-all group"
                  >
                    <span className="text-xs font-bold text-white group-active:text-brand-primary">{name}</span>
                    <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center group-active:border-brand-primary group-active:bg-brand-primary">
                      <Check size={10} className="text-white" />
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setView('options')} className="w-full mt-2 text-[10px] font-black text-slate-500 uppercase tracking-widest py-2">
                Volver
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const HistoryPage: React.FC = () => {
  const { tickets, draws, isTicketsRefreshing } = useStore();
  const [activeFilter, setActiveFilter] = useState<FilterType>('TODO');
  const [expandedDrawId, setExpandedDrawId] = useState<string | null>(null);
  const [previewTicket, setPreviewTicket] = useState<Ticket | null>(null);
  const [shareOptionsTicket, setShareOptionsTicket] = useState<Ticket | null>(null);
  const [cachedDrawHistory, setCachedDrawHistory] = useState<DrawHistoryItem[]>([]);

  const handleShareClick = (ticket: Ticket) => {
    if (ticket.drawIds && ticket.drawIds.length > 1) {
      setShareOptionsTicket(ticket);
    } else {
      setPreviewTicket(ticket);
    }
  };

  const ticketsByDraw = useMemo(() => {
    const grouped = new Map<string, Ticket[]>();
    tickets.forEach((ticket) => {
      (ticket.drawIds || []).forEach((drawId) => {
        const current = grouped.get(drawId);
        if (current) {
          current.push(ticket);
        } else {
          grouped.set(drawId, [ticket]);
        }
      });
    });
    return grouped;
  }, [tickets]);

  const sortedTicketsByDraw = useMemo(() => {
    const sorted = new Map<string, Ticket[]>();
    ticketsByDraw.forEach((drawTickets, drawId) => {
      const ordered = [...drawTickets].sort((a, b) => {
        const customerA = getCustomerDisplayName(a.customerName, a.sequenceNumber, a.id);
        const customerB = getCustomerDisplayName(b.customerName, b.sequenceNumber, b.id);
        if (customerA !== customerB) {
          return customerA.localeCompare(customerB, 'es', { sensitivity: 'base' });
        }
        return b.timestamp - a.timestamp;
      });
      sorted.set(drawId, ordered);
    });
    return sorted;
  }, [ticketsByDraw]);

  const drawHistoryFresh = useMemo(() => {
    const { settings } = useStore.getState();

    const grouped = draws
      .map((draw) => {
        const drawTickets = sortedTicketsByDraw.get(draw.id) || [];

        const filteredTickets =
          activeFilter === 'TODO'
            ? drawTickets
            : drawTickets.filter((ticket) => getEntriesForDraw(ticket, draw.id).some((entry) => entry.type === activeFilter));

        if (filteredTickets.length === 0) {
          return null;
        }

        const totalSold = filteredTickets.reduce((sum, ticket) => sum + calculateTicketSalesForDraw(ticket, draw.id), 0);

        let totalPrizes = 0;
        if (draw.results && draw.results.length === 3) {
          filteredTickets.forEach((ticket) => {
            totalPrizes += calculateTicketPayoutForDraw(ticket, draw, settings);
          });
        }

        return {
          ...draw,
          status: getDrawStatus(draw) === 'closed' ? 'closed' : 'open',
          totalSold,
          totalPrizes,
          tickets: filteredTickets,
          isActive: totalSold > 0,
        } as DrawHistoryItem;
      })
      .filter((item): item is DrawHistoryItem => !!item && item.isActive);

    return sortDrawsByTime(grouped);
  }, [draws, sortedTicketsByDraw, activeFilter]);

  useEffect(() => {
    if (drawHistoryFresh.length > 0) {
      setCachedDrawHistory(drawHistoryFresh);
    }
  }, [drawHistoryFresh]);

  const drawHistoryStable = useMemo(() => {
    if (drawHistoryFresh.length > 0) {
      return drawHistoryFresh;
    }
    if (isTicketsRefreshing && cachedDrawHistory.length > 0) {
      return cachedDrawHistory;
    }
    return drawHistoryFresh;
  }, [drawHistoryFresh, isTicketsRefreshing, cachedDrawHistory]);

  useEffect(() => {
    if (expandedDrawId && !drawHistoryStable.some((draw) => draw.id === expandedDrawId)) {
      setExpandedDrawId(null);
    }
  }, [expandedDrawId, drawHistoryStable]);

  const handleToggleExpand = (id: string) => {
    setExpandedDrawId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col h-full bg-[#0B1220] text-white select-none overflow-hidden">
      <PullToRefresh onRefresh={async () => { window.location.reload(); }} className="flex-1 px-3 py-4 pb-24">
        <HistoryFilters
          activeFilter={activeFilter}
          onFilterChange={(filter) => {
            setActiveFilter(filter);
          }}
        />

        <div className="space-y-0.5">
          <AnimatePresence mode="popLayout">
            {drawHistoryStable.length > 0 ? (
              drawHistoryStable.map((draw) => {
                const isExpanded = expandedDrawId === draw.id;
                return (
                  <motion.div
                    key={draw.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <DrawHistoryCard
                      draw={draw}
                      isExpanded={isExpanded}
                      onToggle={() => handleToggleExpand(draw.id)}
                      onShare={handleShareClick}
                    />
                  </motion.div>
                );
              })
            ) : isTicketsRefreshing ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 opacity-60">
                <Loader2 size={24} className="animate-spin mb-3 text-brand-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest">Cargando historial...</p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 opacity-40">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                  <BarChart3 size={24} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest">No hay ventas registradas</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PullToRefresh>

      {shareOptionsTicket && (
        <ShareOptionsModal
          ticket={shareOptionsTicket}
          onClose={() => setShareOptionsTicket(null)}
          onSelect={(ticket) => {
            setPreviewTicket(ticket);
            setShareOptionsTicket(null);
          }}
        />
      )}

      {previewTicket && <TicketModal ticket={previewTicket} onClose={() => setPreviewTicket(null)} />}
    </div>
  );
};
