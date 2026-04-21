import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { BarChart3, TrendingUp, Hash, CheckCircle2 } from 'lucide-react';
import { StatsDrawCard } from './Stats/StatsDrawCard';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, getDrawStatus } from '../utils/helpers';
import { PullToRefresh } from './PullToRefresh';
import { calculateTicketSalesForDraw, getEntriesForDraw } from '../utils/ticketUtils';

export const StatsDashboard: React.FC = () => {
  const { tickets, draws } = useStore();

  const stats = useMemo(() => {
    const pricePerTime = useStore.getState().settings.pricePerTime || 1;

    // Total sales (all types)
    const totalSales = tickets.reduce((sum, t) => sum + t.total, 0);
    
    // Total "times" sold (only CHANCE entries)
    const totalTimesSold = tickets.reduce((sum, t) => {
      return sum + (t.drawIds || []).reduce((drawSum, drawId) => {
        return drawSum + getEntriesForDraw(t, drawId).reduce((entrySum, entry) => {
          if (entry.type === 'CHANCE') {
            return entrySum + entry.pieces;
          }
          return entrySum;
        }, 0);
      }, 0);
    }, 0);

    // Group tickets by draw
    const drawStats = draws.map(draw => {
      const drawTickets = tickets.filter(t => t.drawIds?.includes(draw.id));
      const soldAmount = Number(drawTickets.reduce((sum, t) => sum + calculateTicketSalesForDraw(t, draw.id), 0).toFixed(2));
      const timesSold = drawTickets.reduce((sum, t) => {
        return sum + (getEntriesForDraw(t, draw.id).reduce((eSum, e) => {
          if (e.type === 'CHANCE') {
            return eSum + e.pieces;
          }
          return eSum;
        }, 0) || 0);
      }, 0);
      const prizes = drawTickets.reduce((sum, t) => 
        sum + (getEntriesForDraw(t, draw.id).reduce((eSum, e) => eSum + (e.prize || 0), 0) || 0), 0
      );

      return { 
        ...draw, 
        soldAmount, 
        timesSold, 
        prizes,
        tickets: drawTickets,
        status: getDrawStatus(draw),
        isActive: soldAmount > 0
      };
    }).filter(d => d.isActive);

    // Total commission (independent income)
    const totalCommission = tickets.reduce((sum, t) => sum + (t.commission || 0), 0);

    return { totalSales, totalTimesSold, totalCommission, drawStats };
  }, [tickets, draws]);

  return (
    <div className="flex flex-col h-full bg-[#0B1220] text-white select-none overflow-hidden">
      <PullToRefresh 
        onRefresh={async () => { window.location.reload(); }}
        className="flex-1 px-3 py-4 pb-24"
      >
        {/* Draw List */}
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {stats.drawStats.length > 0 ? (
              stats.drawStats.map((draw) => (
                <motion.div
                  key={draw.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <StatsDrawCard 
                    draw={draw} 
                    tickets={draw.tickets} 
                  />
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 opacity-40"
              >
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                  <BarChart3 size={24} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest">No hay ventas registradas</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PullToRefresh>
    </div>
  );
};
