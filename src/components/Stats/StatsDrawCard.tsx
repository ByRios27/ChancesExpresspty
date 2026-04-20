import React, { useState, useMemo } from 'react';
import { Calendar, ChevronDown, Lock, BarChart3 } from 'lucide-react';
import { cn, formatAMPM, formatCurrency, getDrawStatus } from '../../utils/helpers';
import { Ticket, Entry, Draw, useStore } from '../../store/useStore';
import { calculateEntryPrize } from '../../utils/prizeCalculator';
import { motion, AnimatePresence } from 'motion/react';
import { StatsResultsHeader } from './StatsResultsHeader';
import { StatsNumberGrid } from './StatsNumberGrid';
import { StatsCombinationsSection } from './StatsCombinationsSection';
import { calculateTicketPayoutForDraw, calculateTicketSalesForDraw, getEntriesForDraw } from '../../utils/ticketUtils';

interface DrawStatsProps {
  draw: Draw;
  tickets: Ticket[];
}

export const StatsDrawCard: React.FC<DrawStatsProps> = ({ draw, tickets }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate stats for this draw
  const { settings } = useStore();
  const stats = useMemo(() => {
    const drawTickets = tickets.filter(t => t.drawIds?.includes(draw.id));
    
    const pricePerTime = settings.pricePerTime || 1;

    // Total sold for this draw (proportional if multi-draw) - in money for internal loss calculation
    const totalSoldMoney = drawTickets.reduce((sum, t) => sum + calculateTicketSalesForDraw(t, draw.id), 0);
    const totalFractions = totalSoldMoney / pricePerTime;

    // Total prizes for this draw
    let totalPrizes = 0;
    if (draw.results && draw.results.length === 3) {
      drawTickets.forEach(t => {
        totalPrizes += calculateTicketPayoutForDraw(t, draw, settings);
      });
    }

    // Sales by number (00-99)
    const salesByNumber: { [number: string]: number } = {};
    const prizesByNumber: { [number: string]: number } = {};
    const combinationsMap: { [key: string]: Entry } = {};
    
    drawTickets.forEach(t => {
      getEntriesForDraw(t, draw.id).forEach(e => {
        const amountForDraw = e.amount;
        const pieces = e.pieces;
        
        if (e.type === 'CHANCE') {
          const num = e.number.length === 4 ? e.number.slice(-2) : e.number;
          salesByNumber[num] = (salesByNumber[num] || 0) + pieces;
          if (e.prize && e.prize > 0) {
            prizesByNumber[num] = (prizesByNumber[num] || 0) + e.prize;
          }
        } else if (e.type === 'PALÃ‰') {
          // Add to both numbers in the grid
          const n1 = e.number.substring(0, 2);
          const n2 = e.number.substring(2, 4);
          salesByNumber[n1] = (salesByNumber[n1] || 0) + pieces;
          salesByNumber[n2] = (salesByNumber[n2] || 0) + pieces;

          const key = `${e.type}-${e.number}`;
          if (combinationsMap[key]) {
            combinationsMap[key].amount = Number((combinationsMap[key].amount + amountForDraw).toFixed(2));
            (combinationsMap[key] as any).quantity = ((combinationsMap[key] as any).quantity || 0) + pieces;
            if (e.prize) {
              combinationsMap[key].prize = (combinationsMap[key].prize || 0) + e.prize;
            }
          } else {
            combinationsMap[key] = { ...e, amount: amountForDraw };
            (combinationsMap[key] as any).quantity = pieces;
          }
        } else if (e.type === 'BILLETE') {
          // Add to last 2 digits in the grid
          const num = e.number.slice(-2);
          salesByNumber[num] = (salesByNumber[num] || 0) + pieces;

          const key = `${e.type}-${e.number}`;
          if (combinationsMap[key]) {
            combinationsMap[key].amount = Number((combinationsMap[key].amount + amountForDraw).toFixed(2));
            (combinationsMap[key] as any).quantity = ((combinationsMap[key] as any).quantity || 0) + pieces;
            if (e.prize) {
              combinationsMap[key].prize = (combinationsMap[key].prize || 0) + e.prize;
            }
          } else {
            combinationsMap[key] = { ...e, amount: amountForDraw };
            (combinationsMap[key] as any).quantity = pieces;
          }
        }
      });
    });

    const combinations = Object.values(combinationsMap);
    const hasResults = !!draw.results && draw.results.length === 3;
    const isLoss = totalPrizes > totalSoldMoney;
    const isWinnerDraw = hasResults && totalPrizes > 0 && !isLoss;

    return {
      totalSoldMoney,
      totalFractions,
      totalPrizes,
      salesByNumber,
      prizesByNumber,
      combinations,
      isLoss,
      isWinnerDraw
    };
  }, [draw, tickets, settings]);

  return (
    <div className={cn(
      "rounded-[1.2rem] border transition-all duration-300 overflow-hidden mb-3",
      stats.isLoss
        ? "bg-[#1A1212] border-red-500/30"
        : stats.isWinnerDraw
          ? "bg-[#0E1B14] border-green-500/30"
          : "bg-[#121A2B] border-[#1E293B]",
      isExpanded && !stats.isLoss && !stats.isWinnerDraw ? "border-brand-primary/30 shadow-[0_0_20px_rgba(22,163,74,0.1)]" : "",
      isExpanded && stats.isWinnerDraw ? "border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.15)]" : "",
      isExpanded && stats.isLoss ? "border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.15)]" : ""
    )}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "p-3 flex items-center justify-between transition-colors cursor-pointer",
          stats.isLoss ? "active:bg-red-500/10" : stats.isWinnerDraw ? "active:bg-green-500/10" : "active:bg-white/5"
        )}
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className={stats.isLoss ? "text-red-400" : stats.isWinnerDraw ? "text-green-400" : "text-slate-500"}
          >
            <ChevronDown size={18} />
          </motion.div>
          
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            stats.isLoss
              ? "bg-red-500/20 text-red-400"
              : stats.isWinnerDraw
                ? "bg-green-500/20 text-green-400"
                : "bg-brand-primary/10 text-brand-primary"
          )}>
            <span className="text-[10px] font-black">{draw.digitsMode}D</span>
          </div>
          
          <div className="ml-1">
            <div className="flex items-center gap-1.5">
              <h4 className={cn("font-black text-[13px] tracking-tight leading-none", stats.isLoss ? "text-red-100" : stats.isWinnerDraw ? "text-green-100" : "text-white")}>{draw.name}</h4>
              {getDrawStatus(draw) === 'closed' && <Lock size={10} className={stats.isLoss ? "text-red-500/50" : stats.isWinnerDraw ? "text-green-500/60" : "text-slate-600"} />}
            </div>
            <p className={cn(
              "text-[9px] font-bold uppercase tracking-widest mt-1.5",
              stats.isLoss ? "text-red-400/60" : stats.isWinnerDraw ? "text-green-400/70" : "text-slate-500"
            )}>
              {formatAMPM(draw.drawTime)}
            </p>
          </div>
        </div>

        <div className={cn(
          "px-4 py-2 rounded-xl border shadow-inner text-center min-w-[80px]",
          stats.isLoss ? "bg-red-500/10 border-red-500/20" : stats.isWinnerDraw ? "bg-green-500/10 border-green-500/20" : "bg-[#0B1220] border-white/5"
        )}>
          <span className={cn(
            "text-[8px] font-black uppercase tracking-widest block mb-0.5",
            stats.isLoss ? "text-red-400" : stats.isWinnerDraw ? "text-green-400" : "text-slate-500"
          )}>FRACCIONES</span>
          <p className={cn("text-sm font-black leading-none tracking-tight", stats.isLoss ? "text-red-100" : stats.isWinnerDraw ? "text-green-100" : "text-white")}>
            {Number.isInteger(stats.totalFractions) ? stats.totalFractions : stats.totalFractions.toFixed(2)}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className={cn(
              "px-3 pb-6",
              stats.isLoss ? "bg-black/40" : stats.isWinnerDraw ? "bg-green-950/20" : "bg-black/20"
            )}>
              <div className="h-[1px] w-full bg-white/5 mb-4" />
              
              {/* Results Block */}
              <StatsResultsHeader results={draw.results} />

              {/* Grid */}
              <StatsNumberGrid 
                salesByNumber={stats.salesByNumber} 
                results={draw.results}
              />

              {/* Volume Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 opacity-40">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                  <span className="text-[7px] font-black uppercase tracking-widest">Sin Ventas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand-primary/20" />
                  <span className="text-[7px] font-black uppercase tracking-widest">Bajo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand-primary/60" />
                  <span className="text-[7px] font-black uppercase tracking-widest">Alto</span>
                </div>
              </div>

              {/* Combinations */}
              <StatsCombinationsSection combinations={stats.combinations} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
