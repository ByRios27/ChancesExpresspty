import React, { useRef } from 'react';
import { Ticket as TicketType } from '../store/useStore';
import { Share2, X, CheckCircle2 } from 'lucide-react';
import { TicketReceipt } from './Sales/TicketReceipt';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { exportNodeAsPng } from '../utils/shareImage';
import { formatAMPM, formatCurrency } from '../utils/helpers';
import { useStore } from '../store/useStore';

interface TicketModalProps {
  ticket: TicketType;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ ticket, onClose }) => {
  const ticketRef = useRef<HTMLDivElement>(null);
  const fileName = `ticket-${ticket.id.substring(0, 8)}.png`;
  const draws = useStore((state) => state.draws);

  const ticketDrawSummary = ticket.drawIds
    .map((drawId, index) => {
      const draw = draws.find((d) => d.id === drawId);
      const drawName = ticket.drawNames?.[index] || draw?.name || 'Sorteo';
      const drawTime = draw?.drawTime ? formatAMPM(draw.drawTime) : '';
      return drawTime ? `${drawName} ${drawTime}` : drawName;
    })
    .join(' | ');

  const shareText = `Ticket: *${ticketDrawSummary || 'Sorteo'}*\nMonto Total: *$${formatCurrency(ticket.total)}*`;

  const downloadTicket = (dataUrl: string) => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  };

  const handleShare = async () => {
    if (!ticketRef.current) return;

    try {
      const dataUrl = await exportNodeAsPng(ticketRef.current);

      if (Capacitor.isNativePlatform()) {
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        const saved = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });

        await Share.share({
          title: 'Ticket LottoPro',
          text: shareText,
          url: saved.uri,
          dialogTitle: 'Compartir ticket',
        });
        return;
      }

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Ticket LottoPro',
            text: shareText,
          });
        } catch (shareErr: any) {
          if (shareErr.name !== 'AbortError') {
            throw shareErr;
          }
          downloadTicket(dataUrl);
        }
      } else {
        downloadTicket(dataUrl);
      }
    } catch (err) {
      console.error('Error sharing ticket:', err);
      alert('No se pudo compartir el ticket. Se intentara descargar la imagen.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="relative w-full max-w-sm animate-in fade-in zoom-in duration-300">
        <div className="bg-[#121A2B] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
          <div className="bg-brand-primary p-6 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} className="text-white" />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-widest">Venta Exitosa</h3>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-tighter mt-1">Comprobante generado correctamente</p>
          </div>

          <div className="max-h-[60vh] overflow-y-auto bg-white">
            <div ref={ticketRef}>
              <TicketReceipt ticket={ticket} />
            </div>
          </div>

          <div className="p-6 bg-[#121A2B] border-t border-white/5 flex flex-col gap-3">
            <button
              onClick={handleShare}
              className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/20 active:scale-95 transition-transform"
            >
              <Share2 size={18} />
              Compartir Ticket
            </button>
            <button
              onClick={onClose}
              className="w-full bg-white/5 text-slate-400 py-4 rounded-2xl font-black text-sm uppercase tracking-widest active:bg-white/10 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
