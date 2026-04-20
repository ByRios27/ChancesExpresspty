import React, { useMemo, useState } from 'react';
import { useStore, Ticket } from '../../store/useStore';
import { Trophy, Clock, User, ChevronRight, Search, Ticket as TicketIcon } from 'lucide-react';
import { formatCurrency, getCustomerDisplayName } from '../../utils/helpers';
import { motion, AnimatePresence } from 'motion/react';
import { TicketModal } from '../TicketModal';
import { calculateTicketPayoutForDraw, getEntriesForDraw, getTicketSubtotalForDraw, getWinningEntriesForDraw, normalizeTicketDrawEntries } from '../../utils/ticketUtils';

export const WinnersPage: React.FC = () => {
  const { tickets, draws } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Filter and group winning tickets by draw
  const winnersByDraw = useMemo(() => {
    const winningTickets = tickets.filter(t => (t.totalPrize || 0) > 0);
    
    // Filter by search term (customer name or ticket ID)
    const filtered = winningTickets.filter(t => 
      getCustomerDisplayName(t.customerName, t.sequenceNumber, t.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped: Record<string, { drawName: string, tickets: Ticket[], totalDrawPrizes: number }> = {};

    filtered.forEach(ticket => {
      ticket.drawIds?.forEach((drawId, idx) => {
        const draw = draws.find(d => d.id === drawId);
        if (!draw || !draw.results || draw.results.length !== 3) return;

        const settings = useStore.getState().settings;
        const drawPrize = calculateTicketPayoutForDraw(ticket, draw, settings);

        if (drawPrize <= 0) return;
        
        if (!grouped[drawId]) {
          grouped[drawId] = {
            drawName: ticket.drawNames[idx] || draw.name,
            tickets: [],
            totalDrawPrizes: 0
          };
        }
        
        // Add ticket to this draw group with its specific prize for this draw
        // We clone the ticket to store the draw-specific prize for display
        const matchingGroup = normalizeTicketDrawEntries(ticket).filter((group) => group.drawId === drawId);
        const winningEntries = getWinningEntriesForDraw(ticket, draw, settings);
        const ticketForDraw = {
          ...ticket,
          drawIds: [drawId],
          drawNames: [ticket.drawNames[idx] || draw.name],
          drawEntries: matchingGroup,
          entries: winningEntries.length > 0 ? winningEntries : getEntriesForDraw(ticket, drawId),
          total: getTicketSubtotalForDraw(ticket, drawId),
          totalPrize: drawPrize,
        };
        grouped[drawId].tickets.push(ticketForDraw);
        grouped[drawId].totalDrawPrizes += drawPrize;
      });
    });

    return Object.entries(grouped).sort((a, b) => b[1].totalDrawPrizes - a[1].totalDrawPrizes);
  }, [tickets, draws, searchTerm]);

  const totalWinnersCount = useMemo(() => {
    return tickets.filter(t => (t.totalPrize || 0) > 0).length;
  }, [tickets]);

  const totalPrizesAmount = useMemo(() => {
    return tickets.reduce((sum, t) => sum + (t.totalPrize || 0), 0);
  }, [tickets]);

  return (
    <div className="flex flex-col h-full bg-[#0B1220] text-white select-none overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-4 pb-24">
        {/* Summary Header */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-brand-primary/10 p-3 rounded-2xl border border-brand-primary/20 shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={12} className="text-brand-primary" />
              <span className="text-[7px] font-black text-brand-primary uppercase tracking-widest">Ganadores</span>
            </div>
            <p className="text-xl font-black text-white tracking-tight">{totalWinnersCount}</p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={12} className="text-emerald-400" />
              <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest">Premios</span>
            </div>
            <p className="text-xl font-black text-white tracking-tight">${formatCurrency(totalPrizesAmount)}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Buscar cliente o ticket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs font-bold placeholder:text-slate-600 focus:outline-none focus:border-brand-primary/50 transition-all"
          />
        </div>

        {/* Winners List */}
        <div className="space-y-8">
          {winnersByDraw.length > 0 ? (
            winnersByDraw.map(([drawId, data]) => (
              <div key={drawId} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-primary" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{data.drawName}</h3>
                  </div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                    ${formatCurrency(data.totalDrawPrizes)} en premios
                  </span>
                </div>

                <div className="space-y-2">
                  {data.tickets.map((ticket) => (
                    <motion.button
                      key={ticket.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedTicket(ticket)}
                      className="w-full bg-[#121A2B] p-3 rounded-xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center text-brand-primary group-hover:bg-brand-primary/20 transition-all">
                          <TicketIcon size={20} />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-black text-white uppercase tracking-tight">#{ticket.sequenceNumber}</span>
                            <span className="text-[9px] font-bold text-slate-500">ID: {ticket.id.substring(0, 8)}</span>
                            <span className="text-[9px] font-bold text-brand-primary uppercase">V: {ticket.sellerId ?? '---'}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <User size={8} className="text-slate-500" />
                            <p className="text-[10px] font-bold text-slate-300 uppercase">{getCustomerDisplayName(ticket.customerName, ticket.sequenceNumber, ticket.id)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Premio</p>
                          <p className="text-xs font-black text-emerald-400">${formatCurrency(ticket.totalPrize || 0)}</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-600 group-hover:text-white transition-colors" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-slate-700">
                <Trophy size={40} />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">No hay ganadores</h3>
              <p className="text-slate-500 text-xs max-w-[200px] mx-auto leading-relaxed">
                {searchTerm ? 'No se encontraron ganadores que coincidan con tu búsqueda.' : 'Aún no se han registrado tickets premiados para los sorteos actuales.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketModal 
          ticket={selectedTicket} 
          onClose={() => setSelectedTicket(null)} 
        />
      )}
    </div>
  );
};
