import React, { useState, useMemo } from 'react';
import { Ticket, useStore } from '../../store/useStore';
import { calculateEntryPrize } from '../../utils/prizeCalculator';
import { cn, formatCurrency, getDrawStatus, formatPlayNumberForDisplay, getCustomerDisplayName } from '../../utils/helpers';
import { PinValidationModal } from '../PinValidationModal';
import { calculateTicketPayoutForDraw, getEntriesForDraw, getTicketSubtotalForDraw } from '../../utils/ticketUtils';
import { 
  Trash2, 
  Edit2, 
  Share2, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Layers,
  FileText,
  Clock
} from 'lucide-react';

interface DetailProps {
  drawId: string;
  tickets: Ticket[];
  onShare: (ticket: Ticket) => void;
  isLoss?: boolean;
}

export const DrawHistoryDetail: React.FC<DetailProps> = ({ drawId, tickets, onShare, isLoss }) => {
  const { deleteTicket, setReusedTicket, setEditingTicket, setCurrentPage: setGlobalPage } = useStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const itemsPerPage = 5;
  
  const draws = useStore(state => state.draws);
  const settings = useStore(state => state.settings);

  const calculateEntryPrizeForDraw = (entry: any, drawId: string) => {
    const draw = draws.find(d => d.id === drawId);
    if (!draw) return { prize: 0, winningPosition: undefined };
    return calculateEntryPrize(entry, draw, settings);
  };

  // Prepare tickets with calculated total prizes FOR THIS SPECIFIC DRAW
  const ticketsWithPrizes = useMemo(() => {
    return tickets.map(t => {
      const draw = draws.find(d => d.id === drawId);
      const drawSpecificPrize = draw ? calculateTicketPayoutForDraw(t, draw, settings) : 0;
      return {
        ...t,
        calculatedTotalPrize: drawSpecificPrize
      };
    });
  }, [tickets, drawId, draws, settings]);

  // Sort tickets if it's a loss: Winners first (by prize amount desc), then non-winners
  const hasDrawResults = useMemo(() => {
    const draw = draws.find((d) => d.id === drawId);
    return !!(draw?.results && draw.results.length === 3);
  }, [draws, drawId]);

  const sortedTickets = useMemo(() => {
    const sorted = [...ticketsWithPrizes];
    const getSortTime = (ticket: Ticket & { calculatedTotalPrize: number }) => {
      const createdAtValue = (ticket as any).createdAt;
      const createdAt = typeof createdAtValue === 'number' ? createdAtValue : 0;
      return createdAt > 0 ? createdAt : (ticket.timestamp || 0);
    };

    if (hasDrawResults) {
      sorted.sort((a, b) => {
        const aIsWinner = a.calculatedTotalPrize > 0;
        const bIsWinner = b.calculatedTotalPrize > 0;

        if (aIsWinner !== bIsWinner) return aIsWinner ? -1 : 1;
        return getSortTime(b) - getSortTime(a);
      });
    } else {
      sorted.sort((a, b) => getSortTime(b) - getSortTime(a));
    }
    return sorted;
  }, [ticketsWithPrizes, hasDrawResults]);

  const totalPages = Math.ceil(sortedTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTickets = sortedTickets.slice(startIndex, startIndex + itemsPerPage);

  const handleReuse = (ticket: Ticket) => {
    setEditingTicket(null);
    setReusedTicket(ticket);
    setGlobalPage('sales');
  };

  const handleEdit = (ticket: Ticket) => {
    setReusedTicket(null);
    setEditingTicket(ticket);
    setGlobalPage('sales');
  };

  const handleDeleteClick = (id: string) => {
    setTicketToDelete(id);
    setIsPinModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (ticketToDelete) {
      try {
        await deleteTicket(ticketToDelete);
        setTicketToDelete(null);
      } catch (error) {
        console.error('Ticket delete failed', error);
        alert('No se pudo eliminar el ticket.');
      }
    }
  };

  return (
    <div className="mt-2 space-y-1.5">
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-[#0B1220]/50 p-1 rounded-xl border border-white/5 mb-2">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1E293B] rounded-lg text-[9px] font-black uppercase tracking-tighter disabled:opacity-20 transition-all active:scale-95"
          >
            <ChevronLeft size={10} />
            Prev
          </button>
          
          <div className="text-center">
            <div className="flex items-center gap-1.5">
              <span className="bg-white/5 w-5 h-5 flex items-center justify-center rounded-md text-[9px] font-black text-white border border-white/5">{currentPage}</span>
              <span className="text-[8px] font-bold text-slate-500">/ {totalPages}</span>
            </div>
          </div>

          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-primary rounded-lg text-[9px] font-black uppercase tracking-tighter disabled:opacity-20 transition-all active:scale-95 shadow-lg shadow-brand-primary/20"
          >
            Next
            <ChevronRight size={10} />
          </button>
        </div>
      )}

      {/* Tickets List */}
      <div className="space-y-1.5">
        {currentTickets.map((ticket) => {
          const hasPrize = ticket.calculatedTotalPrize > 0;
          
          return (
            <div 
              key={ticket.id} 
              className={cn(
                "bg-[#121A2B] rounded-[0.9rem] border p-2 shadow-lg relative overflow-hidden group transition-all",
                hasPrize ? "border-brand-primary/40" : "border-white/5"
              )}
            >
              {/* Ticket Header */}
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="text-[10px] font-bold text-white/95 tracking-tight leading-none uppercase truncate max-w-[160px]">
                    {getCustomerDisplayName(ticket.customerName, ticket.sequenceNumber, ticket.id)}
                  </h3>
                  <span className="text-[7px] font-semibold text-brand-primary uppercase">V: {ticket.sellerId ?? '---'}</span>
                  {ticket.drawIds && ticket.drawIds.length > 1 && (
                    <div className="w-4 h-4 bg-brand-primary/20 rounded-md flex items-center justify-center text-brand-primary">
                      <Layers size={8} />
                    </div>
                  )}
                  {ticket.isPaid && (
                    <span className="px-1 py-0.5 bg-brand-primary/20 text-brand-primary text-[6px] font-black uppercase tracking-widest rounded border border-brand-primary/20">
                      Pagado
                    </span>
                  )}
                </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-white leading-none">
                      ${formatCurrency(getTicketSubtotalForDraw(ticket, drawId))}
                    </p>
                    {ticket.drawIds && ticket.drawIds.length > 1 && (
                      <p className="text-[7px] font-bold text-slate-500 mt-0.5 uppercase tracking-tighter">
                        Total: ${formatCurrency(ticket.total)}
                      </p>
                    )}
                    {hasPrize && (
                    <p className="text-[7px] font-semibold text-brand-primary mt-0.5 uppercase tracking-tighter">
                      GANÓ: ${formatCurrency(ticket.calculatedTotalPrize)}
                    </p>
                  )}
                </div>
              </div>

              {/* Icons Row */}
              <div className="flex gap-1.5 mb-1.5">
                <button onClick={() => onShare(ticket)} className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-slate-400 active:text-brand-primary active:bg-brand-primary/10 transition-all">
                  <Share2 size={10} />
                </button>
                <button onClick={() => handleReuse(ticket)} className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-slate-400 active:text-brand-primary active:bg-brand-primary/10 transition-all">
                  <RefreshCw size={10} />
                </button>
                {/* Only allow edit and delete if no draw in the ticket is closed */}
                {(!ticket.drawIds || !ticket.drawIds.some(id => {
                  const d = useStore.getState().draws.find(d => d.id === id);
                  return d ? getDrawStatus(d) === 'closed' : true;
                })) && (
                  <>
                    <button onClick={() => handleEdit(ticket)} className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-slate-400 active:text-brand-primary active:bg-brand-primary/10 transition-all ml-auto">
                      <Edit2 size={10} />
                    </button>
                    <button onClick={() => handleDeleteClick(ticket.id)} className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-slate-400 active:text-red-400 active:bg-red-400/10 transition-all">
                      <Trash2 size={10} />
                    </button>
                  </>
                )}
              </div>

              {/* Time and TX */}
              <div className="flex items-center justify-between mb-1.5 opacity-70">
                <div className="flex items-center gap-1 text-slate-400">
                  <Clock size={7} className="text-brand-primary" />
                  <p className="text-[7px] font-bold tracking-tight">
                    {new Date(ticket.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                  </p>
                </div>
                <p className="text-[6px] text-slate-500 font-bold tracking-[0.05em] uppercase">
                  TX: {ticket.id.slice(0, 10).toUpperCase()}
                </p>
              </div>

              {/* Plays List */}
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {getEntriesForDraw(ticket, drawId).map((entry, idx) => {
                  const { prize: entryPrizeInDraw } = calculateEntryPrizeForDraw(entry, drawId);
                  const isWinner = entryPrizeInDraw > 0;

                  return (
                    <div key={idx} className="min-w-[82px] py-0.5 leading-none">
                      <p className={cn(
                        "text-[10px] font-semibold tracking-tight",
                        isWinner ? "text-brand-primary" : "text-white/90"
                      )}>
                        {formatPlayNumberForDisplay(entry.number, entry.type)} x{entry.pieces}
                      </p>
                      <div className="text-[7px] font-medium text-slate-300 mt-0.5">
                        ${formatCurrency(entry.amount)}
                        {isWinner && (
                          <span className="text-brand-primary font-semibold ml-1">+{formatCurrency(entryPrizeInDraw)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      {tickets.length === 0 && (
        <div className="py-10 text-center">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 opacity-10">
            <FileText size={24} />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-700">No hay registros</p>
        </div>
      )}

      <PinValidationModal 
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setTicketToDelete(null);
        }}
        onSuccess={handleConfirmDelete}
        title="Eliminar Ticket"
        description="Confirma tu PIN para eliminar esta venta."
      />
    </div>
  );
};


