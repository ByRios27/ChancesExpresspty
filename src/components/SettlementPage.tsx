import React, { useMemo, useRef, useState } from 'react';
import { useStore, Ticket, Draw } from '../store/useStore';
import { formatCurrency } from '../utils/helpers';
import { Wallet, Calendar, TrendingUp, Receipt, ArrowUpRight, ArrowDownRight, Share2 } from 'lucide-react';
import { SettlementReceipt } from './SettlementReceipt';
import { motion, AnimatePresence } from 'motion/react';
import { exportNodeAsPng } from '../utils/shareImage';
import { shareGeneratedImage } from '../utils/shareGeneratedImage';

export const SettlementPage: React.FC = () => {
  const { tickets, draws, currentUser, getGlobalStats } = useStore();
  const settlementRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const stats = useMemo(() => {
    const { totalSales, totalCommission, totalPrizes, totalCapitalInjection, utility } = getGlobalStats();
    const fallbackRate = currentUser?.commission ?? useStore.getState().settings.commissionRate ?? 0.15;
    const effectiveRate = totalSales > 0 ? (totalCommission / totalSales) : fallbackRate;
    const operatingUtility = Number((totalSales - totalCommission - totalPrizes).toFixed(2));
    const liquidationBalance = Number((operatingUtility - totalCapitalInjection).toFixed(2));

    return {
      sales: totalSales,
      prizes: totalPrizes,
      commission: totalCommission,
      injections: totalCapitalInjection,
      netProfit: utility, // utility is totalSales - totalCommission - totalPrizes + injections
      operatingUtility,
      liquidationBalance,
      commissionRate: Number((effectiveRate * 100).toFixed(2))
    };
  }, [getGlobalStats, currentUser?.commission]);

  const isLiquidationPositive = stats.liquidationBalance >= 0;
  const summaryCardClass = isLiquidationPositive
    ? 'bg-emerald-600 rounded-2xl p-5 shadow-lg shadow-emerald-600/25 relative overflow-hidden'
    : 'bg-rose-600 rounded-2xl p-5 shadow-lg shadow-rose-600/25 relative overflow-hidden';
  const finalBlockClass = isLiquidationPositive
    ? 'pt-4 border-t border-emerald-200/30 rounded-xl px-3 pb-3 bg-emerald-500/10'
    : 'pt-4 border-t border-rose-200/30 rounded-xl px-3 pb-3 bg-rose-500/10';

  const handleExportSettlement = async () => {
    setIsExporting(true);

    setTimeout(async () => {
      if (!settlementRef.current) {
        setIsExporting(false);
        return;
      }

      try {
        const dataUrl = await exportNodeAsPng(settlementRef.current, {
          pixelRatio: 4,
          style: {
            textRendering: 'geometricPrecision',
            WebkitFontSmoothing: 'antialiased',
          },
        });

        const dayStamp = new Date().toISOString().split('T')[0];
        await shareGeneratedImage({
          dataUrl,
          fileName: `liquidacion-${dayStamp}.png`,
          title: 'Liquidacion LottoPro',
          text: 'Reporte de liquidacion final',
          dialogTitle: 'Compartir liquidacion',
        });
      } catch (err) {
        console.error('Error sharing settlement:', err);
      } finally {
        setIsExporting(false);
      }
    }, 500);
  };

  return (
    <div className="h-full flex flex-col bg-[#0B1220] text-white overflow-hidden">
      {/* Hidden Export Container */}
      <div className="fixed left-[-9999px] top-0">
        <div ref={settlementRef}>
          <SettlementReceipt 
            operatorName={currentUser?.name || 'Administrador'}
            stats={{
              initialFund: 0,
              grossSales: stats.sales,
              injections: stats.injections,
              prizes: stats.prizes,
              expenses: 0,
              commission: stats.commission,
              netProfit: stats.netProfit,
              liquidationBalance: stats.liquidationBalance
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 pb-24">
        {/* Header Card */}
        <div className={summaryCardClass}>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-1">
              <p className="text-white/60 text-[8px] font-black uppercase tracking-[0.2em]">Liquidación Total</p>
              <button 
                onClick={handleExportSettlement}
                className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-90"
              >
                <Share2 size={16} />
              </button>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter">${formatCurrency(stats.netProfit)}</h2>
            <div className="flex items-center gap-2 mt-4">
              <div className="bg-white/20 px-2 py-1 rounded-lg flex items-center gap-1">
                <Calendar size={10} className="text-white" />
                <span className="text-[8px] font-black text-white uppercase">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="bg-emerald-400/20 px-2 py-1 rounded-lg flex items-center gap-1">
                <TrendingUp size={10} className="text-emerald-400" />
                <span className="text-[8px] font-black text-emerald-400 uppercase">Activo</span>
              </div>
            </div>
          </div>
          <Wallet className="absolute right-[-10px] bottom-[-10px] w-32 h-32 text-white/5 -rotate-12" />
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#121A2B] p-4 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <ArrowUpRight size={14} />
              </div>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Ventas Brutas</span>
            </div>
            <p className="text-lg font-black text-white">${formatCurrency(stats.sales)}</p>
          </div>
          <div className="bg-[#121A2B] p-4 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                <ArrowDownRight size={14} />
              </div>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Premios</span>
            </div>
            <p className="text-lg font-black text-white">${formatCurrency(stats.prizes)}</p>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-[#121A2B] rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Receipt size={14} className="text-brand-primary" />
              Resumen de Operaciones
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">Fondo Inicial</span>
              <span className="text-xs font-black text-white">$0.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">Ventas Totales</span>
              <span className="text-xs font-black text-white">${formatCurrency(stats.sales)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">Premios Automáticos</span>
              <span className="text-xs font-black text-rose-400">-${formatCurrency(stats.prizes)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">Inyección de Capital</span>
              <span className="text-xs font-black text-emerald-400">+${formatCurrency(stats.injections)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">Comisión ({stats.commissionRate}%)</span>
              <span className="text-xs font-black text-blue-400">-${formatCurrency(stats.commission)}</span>
            </div>
            <div className={finalBlockClass}>
              <div className="flex justify-between items-center">
              <span className="text-sm font-black text-white uppercase tracking-tight">Utilidad Final</span>
              <span className="text-lg font-black text-white">${formatCurrency(stats.netProfit)}</span>
              </div>
              <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-white/90">
                {isLiquidationPositive
                  ? `Saldo Casa Grande Positivo: la utilidad supera la inyección (+$${formatCurrency(stats.liquidationBalance)}).`
                  : `Saldo Casa Grande Negativo: pérdida de $${formatCurrency(Math.abs(stats.liquidationBalance))}.`}
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-white/5 p-4 rounded-2xl border border-dashed border-white/10">
          <p className="text-[9px] font-bold text-slate-500 leading-relaxed text-center">
            Este resumen muestra la liquidación proyectada basada en las ventas y premios registrados hasta el momento.
          </p>
        </div>
      </div>

      {/* Exporting Overlay */}
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
