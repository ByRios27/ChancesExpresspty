import React from 'react';
import { Ticket as TicketType, useStore } from '../../store/useStore';
import { calculateEntryPrize } from '../../utils/prizeCalculator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'react-qr-code';
import { AlertCircle } from 'lucide-react';
import { formatCurrency, formatPlayNumberForDisplay, getCustomerDisplayName } from '../../utils/helpers';
import { normalizeTicketDrawEntries } from '../../utils/ticketUtils';

interface TicketReceiptProps {
  ticket: TicketType;
}

export const TicketReceipt: React.FC<TicketReceiptProps> = ({ ticket }) => {
  const draws = useStore(state => state.draws);
  const settings = useStore(state => state.settings);
  const drawGroups = normalizeTicketDrawEntries(ticket);
  const totalPrize = ticket.totalPrize || drawGroups.reduce((sum, group) => (
    sum + group.entries.reduce((entrySum, entry) => entrySum + (entry.prize || 0), 0)
  ), 0);
  const hasPrize = totalPrize > 0;

  const calculateEntryPrizeForDraw = (entry: any, draw: any) => {
    return calculateEntryPrize(entry, draw, settings);
  };

    const getEntryTypeAbbr = (type: string): 'CH' | 'PL' | 'BL' => {
    if (type === 'PALÉ') return 'PL';
    if (type === 'BILLETE') return 'BL';
    return 'CH';
  };

  return (
    <div className="w-full bg-white text-slate-900 p-6 font-sans shadow-sm flex flex-col gap-6 min-h-[600px]">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-brand-primary tracking-tighter leading-none">LOTTOPRO</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Comprobante Oficial</p>
        </div>
        <div className="bg-white p-1 border border-slate-100 rounded-lg shadow-sm">
          <QRCode value={ticket.id} size={50} level="H" />
        </div>
      </div>

      {hasPrize && (
        <div className="bg-brand-primary/10 border border-brand-primary/20 p-4 rounded-xl text-center">
          <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1">¡TICKET PREMIADO!</p>
          <p className="text-2xl font-black text-brand-primary">${formatCurrency(totalPrize)}</p>
        </div>
      )}

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-4">
        <div>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha</p>
          <p className="text-xs font-bold text-slate-800">{format(ticket.timestamp, "dd/MM/yyyy")}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Hora</p>
          <p className="text-xs font-bold text-slate-800">{format(ticket.timestamp, "hh:mm:ss a", { locale: es })}</p>
        </div>
      </div>

      {/* Customer & Seller */}
      <div className="flex justify-between items-center border-y border-slate-100 py-4">
        <div>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
          <p className="text-sm font-black text-slate-900 uppercase">{getCustomerDisplayName(ticket.customerName, ticket.sequenceNumber, ticket.id)}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Vendedor</p>
          <p className="text-sm font-black text-slate-900 uppercase">ID: {ticket.sellerId ?? '---'}</p>
        </div>
      </div>

      {/* Draw Sections */}
      <div className="space-y-6">
        {drawGroups.map((group, idx) => {
          const drawName = group.drawName || 'Sorteo';
          const drawId = group.drawId;
          const draw = draws.find(d => d.id === drawId);
          
          return (
            <div key={idx} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-brand-primary uppercase tracking-tight">{drawName}</span>
              </div>
              
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="pb-2">Número</th>
                    <th className="pb-2 text-center">Cant</th>
                    <th className="pb-2 text-center">Tipo</th>
                    <th className="pb-2 text-right">Monto</th>
                    {hasPrize && <th className="pb-2 text-right text-brand-primary">Premio</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {group.entries.map((entry, eIdx) => {
                    const { prize: entryPrizeInDraw, winningPosition: position } = calculateEntryPrizeForDraw(entry, draw);
                    
                    return (
                      <tr key={eIdx} className="text-sm">
                        <td className="py-2 font-black tracking-widest">
                          {formatPlayNumberForDisplay(entry.number, entry.type)}
                          {position && (
                            <span className="ml-1 text-[8px] font-black text-brand-primary uppercase">({position})</span>
                          )}
                        </td>
                        <td className="py-2 font-bold text-slate-500 text-center">{entry.pieces}</td>
                        <td className="py-2 font-bold text-slate-500 text-[10px] uppercase text-center">{getEntryTypeAbbr(entry.type)}</td>
                        <td className="py-2 font-black text-right text-slate-900">${formatCurrency(entry.amount)}</td>
                        {hasPrize && (
                          <td className="py-2 font-black text-right text-brand-primary">
                            {entryPrizeInDraw > 0 ? `$${formatCurrency(entryPrizeInDraw)}` : '-'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-1">
                <p className="text-[8px] font-bold text-slate-400 uppercase">TX: {ticket.id.substring(0, 8).toUpperCase()}</p>
                <p className="text-[10px] font-black text-slate-900">SUBTOTAL: ${formatCurrency(group.subtotal)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total General */}
      <div className="mt-auto pt-6">
        <div className="bg-brand-primary p-4 rounded-2xl flex justify-between items-center shadow-lg shadow-brand-primary/20">
          <span className="text-sm font-black text-white uppercase tracking-widest">Total General</span>
          <span className="text-2xl font-black text-white">${formatCurrency(ticket.total)}</span>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-3 items-start">
        <AlertCircle size={16} className="text-brand-primary shrink-0 mt-0.5" />
        <p className="text-[9px] font-bold text-slate-500 leading-relaxed">
          IMPORTANTE: Sin comprobante no se pagan premios. Verifique su jugada antes de retirarse.
        </p>
      </div>

      {/* Footer Message */}
      <div className="text-center pb-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">¡Gracias por su compra!</p>
      </div>
    </div>
  );
};

