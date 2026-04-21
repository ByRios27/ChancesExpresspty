import React, { useMemo, useRef, useState } from 'react';
import { useStore, Ticket, Draw } from '../store/useStore';
import { formatCurrency, formatAMPM, cn, getCurrentTimeMinutes } from '../utils/helpers';
import { Share2, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ClosureReceipt } from './ClosureReceipt';
import { calculateTicketPayoutForDraw, calculateTicketSalesForDraw, getEntriesForDraw } from '../utils/ticketUtils';
import { exportNodeAsPng } from '../utils/shareImage';
import { shareGeneratedImage } from '../utils/shareGeneratedImage';

export const ClosuresPage: React.FC = () => {
  const { tickets, draws, currentUser, getGlobalStats } = useStore();
  const closureRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportData, setExportData] = useState<{
    drawName: string;
    drawTime: string;
    operatorName: string;
    totalPieces: number;
    totalSold: number;
    grid: Record<string, number>;
    combinations: Array<{ type: string; number: string; pieces: number; amount: number }>;
  } | null>(null);
  const [selectedDrawId, setSelectedDrawId] = useState<string | null>(null);

  const salesByDraw = useMemo(() => {
    const nowMinutes = getCurrentTimeMinutes();
    const getSortMinutes = (draw: Draw) => draw.closeTimeSort ?? draw.drawTimeSort ?? 0;
    const distanceToNext = (targetMinutes: number) => {
      const raw = targetMinutes - nowMinutes;
      return raw >= 0 ? raw : raw + 1440;
    };

    const report: Record<string, {
      draw: Draw;
      tickets: Ticket[];
      totalSales: number;
      totalPrizes: number;
      chanceSales: number;
      paleSales: number;
      billeteSales: number;
    }> = {};

    draws.forEach((draw) => {
      report[draw.id] = {
        draw,
        tickets: [],
        totalSales: 0,
        totalPrizes: 0,
        chanceSales: 0,
        paleSales: 0,
        billeteSales: 0,
      };
    });

    tickets.forEach((ticket) => {
      ticket.drawIds.forEach((drawId) => {
        if (!report[drawId]) return;

        const r = report[drawId];
        r.tickets.push(ticket);

        const entriesForDraw = getEntriesForDraw(ticket, drawId);
        r.totalSales += calculateTicketSalesForDraw(ticket, drawId);

        if (r.draw.results && r.draw.results.length === 3) {
          const { settings } = useStore.getState();
          r.totalPrizes += calculateTicketPayoutForDraw(ticket, r.draw, settings);
        }

        entriesForDraw.forEach((entry) => {
          if (entry.type === 'CHANCE') r.chanceSales += entry.amount;
          else if (entry.type === 'PALÉ') r.paleSales += entry.amount;
          else if (entry.type === 'BILLETE') r.billeteSales += entry.amount;
        });
      });
    });

    return Object.values(report)
      .filter((item) => item.totalSales > 0 || item.tickets.length > 0)
      .sort((a, b) => {
        const distanceA = distanceToNext(getSortMinutes(a.draw));
        const distanceB = distanceToNext(getSortMinutes(b.draw));
        if (distanceA !== distanceB) return distanceA - distanceB;
        return (a.draw.drawTimeSort || 0) - (b.draw.drawTimeSort || 0);
      });
  }, [tickets, draws]);

  const displayedDraws = useMemo(() => {
    if (!selectedDrawId) return salesByDraw;
    return salesByDraw.filter((d) => d.draw.id === selectedDrawId);
  }, [salesByDraw, selectedDrawId]);

  const globalStats = useMemo(() => getGlobalStats(), [getGlobalStats, tickets, draws]);

  const handleExportImage = async (item: any, isGlobal = false) => {
    const pricePerTime = useStore.getState().settings.pricePerTime || 1;
    const grid: Record<string, number> = {};
    const combinationMap = new Map<string, { type: string; number: string; pieces: number; amount: number }>();
    let pieces = 0;

    const ticketsToProcess = isGlobal ? tickets : item.tickets;

    ticketsToProcess.forEach((t: Ticket) => {
      const drawIdsToUse = isGlobal ? t.drawIds : [item.draw.id];
      drawIdsToUse.forEach((drawId: string) => {
        getEntriesForDraw(t, drawId).forEach((e) => {
          if (e.type === 'CHANCE') {
            const num = e.number.slice(-2);
            const entryPieces = e.pieces ?? (e.amount / pricePerTime);
            grid[num] = (grid[num] || 0) + entryPieces;
            pieces += entryPieces;
            return;
          }

          const displayNumber =
            e.type !== 'BILLETE' && e.number.length === 4
              ? `${e.number.slice(0, 2)}-${e.number.slice(2, 4)}`
              : e.number;
          const key = `${e.type}:${displayNumber}`;
          const existing = combinationMap.get(key);
          const entryPieces = e.pieces ?? (e.amount / pricePerTime);
          combinationMap.set(key, {
            type: e.type,
            number: displayNumber,
            pieces: Number(((existing?.pieces || 0) + entryPieces).toFixed(2)),
            amount: Number(((existing?.amount || 0) + e.amount).toFixed(2)),
          });
        });
      });
    });

    const combinations = Array.from(combinationMap.values()).sort((a, b) => {
      if (a.type === b.type) return a.number.localeCompare(b.number);
      return a.type.localeCompare(b.type);
    });

    const data = {
      drawName: isGlobal ? 'CIERRE GLOBAL' : item.draw.name,
      drawTime: isGlobal ? 'TODOS LOS SORTEOS' : formatAMPM(item.draw.drawTime),
      operatorName: currentUser?.name || 'Administrador',
      totalPieces: pieces,
      totalSold: Number((isGlobal ? globalStats.totalSales : item.totalSales).toFixed(2)),
      grid,
      combinations,
    };

    setExportData(data);
    setIsExporting(true);

    setTimeout(async () => {
      if (!closureRef.current) {
        setIsExporting(false);
        return;
      }

      try {
        const dataUrl = await exportNodeAsPng(closureRef.current, {
          pixelRatio: 4,
          style: {
            textRendering: 'geometricPrecision',
            WebkitFontSmoothing: 'antialiased',
          },
        });
        const safeName = data.drawName.replace(/\s+/g, '-').toLowerCase();
        const shareText = `Sorteo: *${data.drawName}*\nHora: *${data.drawTime}*`;
        await shareGeneratedImage({
          dataUrl,
          fileName: `cierre-${safeName}.png`,
          title: `Cierre LottoPro - ${data.drawName}`,
          text: shareText,
          dialogTitle: 'Compartir cierre',
        });
      } catch (err) {
        console.error('Error sharing closure:', err);
      } finally {
        setIsExporting(false);
        setExportData(null);
      }
    }, 500);
  };

  return (
    <div className="h-full flex flex-col bg-[#0B1220] text-white overflow-hidden">
      <div className="fixed left-[-9999px] top-0">
        <div ref={closureRef}>
          {exportData && (
            <ClosureReceipt
              drawName={exportData.drawName}
              drawTime={exportData.drawTime}
              operatorName={exportData.operatorName}
              totalPieces={exportData.totalPieces}
              totalSold={exportData.totalSold}
              grid={exportData.grid}
              combinations={exportData.combinations}
              title="CIERRE DE SORTEO"
            />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 pb-24">
        <div className="bg-[#121A2B] rounded-xl p-2.5 border border-white/5 shadow-md">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Sorteo</p>
          <select
            value={selectedDrawId || ''}
            onChange={(e) => setSelectedDrawId(e.target.value || null)}
            className="w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-[11px] font-bold text-white outline-none focus:border-brand-primary/40"
          >
            <option value="">TODOS LOS SORTEOS</option>
            {salesByDraw.map((item) => (
              <option key={item.draw.id} value={item.draw.id}>
                {item.draw.name} - {formatAMPM(item.draw.drawTime)}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-[#121A2B] p-3 rounded-xl border border-white/5 shadow-md relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.2em] mb-0.5">Cierre Global</p>
                <div className="flex items-center gap-1.5 text-slate-400 text-[8px] font-bold uppercase tracking-widest">
                  <Calendar size={8} />
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => handleExportImage(globalStats, true)}
                className="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center shadow-md shadow-brand-primary/20 active:scale-90 transition-all"
                title="Exportar Imagen Detallada"
              >
                <Share2 size={15} />
              </button>
            </div>

            <div className="mb-3">
              <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mb-0.5">Ventas Totales</p>
              <h3 className="text-xl font-black text-white tracking-tighter">${formatCurrency(globalStats.totalSales)}</h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                <p className="text-slate-500 text-[7px] font-black uppercase tracking-widest mb-0.5">Premios</p>
                <p className="text-xs font-black text-rose-400">${formatCurrency(globalStats.totalPrizes)}</p>
              </div>
              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                <p className="text-slate-500 text-[7px] font-black uppercase tracking-widest mb-0.5">Utilidad</p>
                <p className={cn('text-xs font-black', globalStats.utility < 0 ? 'text-rose-400' : 'text-emerald-400')}>
                  ${formatCurrency(globalStats.utility)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {displayedDraws.length > 0 ? (
              displayedDraws.map((item, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={item.draw.id}
                  className="bg-[#121A2B] rounded-lg p-2.5 border border-white/5 hover:bg-white/[0.04] transition-all group"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-brand-primary/10 rounded-md flex items-center justify-center text-brand-primary">
                        <Clock size={12} />
                      </div>
                      <div>
                        <h5 className="font-black text-white text-[11px] uppercase tracking-tight">{item.draw.name}</h5>
                        <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">{formatAMPM(item.draw.drawTime)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExportImage(item)}
                      className="w-8 h-8 rounded-md bg-brand-primary text-white flex items-center justify-center shadow-md shadow-brand-primary/20 transition-all active:scale-90"
                      title="Exportar Imagen"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1 mb-2.5">
                    <div className="text-center bg-white/[0.02] p-1.5 rounded-md">
                      <p className="text-[6px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Chance</p>
                      <p className="text-[9px] font-bold text-white">${formatCurrency(item.chanceSales)}</p>
                    </div>
                    <div className="text-center bg-white/[0.02] p-1.5 rounded-md">
                      <p className="text-[6px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Palé</p>
                      <p className="text-[9px] font-bold text-white">${formatCurrency(item.paleSales)}</p>
                    </div>
                    <div className="text-center bg-white/[0.02] p-1.5 rounded-md">
                      <p className="text-[6px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Billete</p>
                      <p className="text-[9px] font-bold text-white">${formatCurrency(item.billeteSales)}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Venta Total</span>
                    <span className="text-sm font-black text-brand-primary">${formatCurrency(item.totalSales)}</span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-white/5 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center border border-dashed border-white/10 opacity-40">
                <Share2 size={40} className="text-slate-600 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">No hay ventas registradas</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-6" />
            <p className="text-white font-black text-sm uppercase tracking-widest animate-pulse">Generando Imagen...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
