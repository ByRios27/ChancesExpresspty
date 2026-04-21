import React from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { cn, formatAMPM, formatCurrency, getDrawStatus } from '../../utils/helpers';
import { DrawHistoryDetail } from './DrawHistoryDetail';
import { Ticket } from '../../store/useStore';
import { motion, AnimatePresence } from 'motion/react';

interface CardProps {
  draw: {
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
  };
  isExpanded: boolean;
  onToggle: () => void;
  onShare: (ticket: Ticket) => void;
}

export const DrawHistoryCard: React.FC<CardProps> = ({ draw, isExpanded, onToggle, onShare }) => {
  const isLoss = draw.totalPrizes > draw.totalSold;
  const hasResults = !!draw.results && draw.results.length === 3;
  const isWinnerDraw = hasResults && draw.totalPrizes > 0 && !isLoss;

  return (
    <div
      className={cn(
        'rounded-[1.2rem] border transition-all duration-300 overflow-hidden mb-1.5',
        isLoss
          ? 'bg-[#1A1212] border-red-500/30'
          : isWinnerDraw
            ? 'bg-[#0E1B14] border-green-500/30'
            : 'bg-[#121A2B] border-[#1E293B]',
        isExpanded && !isLoss && !isWinnerDraw ? 'border-brand-primary/30 shadow-[0_0_20px_rgba(22,163,74,0.1)]' : '',
        isExpanded && isWinnerDraw ? 'border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.15)]' : '',
        isExpanded && isLoss ? 'border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.15)]' : ''
      )}
    >
      <div
        onClick={onToggle}
        className={cn(
          'p-2.5 flex items-center justify-between transition-colors cursor-pointer',
          isLoss ? 'active:bg-red-500/10' : isWinnerDraw ? 'active:bg-green-500/10' : 'active:bg-white/5'
        )}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className={isLoss ? 'text-red-400' : isWinnerDraw ? 'text-green-400' : 'text-slate-500'}
          >
            <ChevronDown size={16} />
          </motion.div>

          <div
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center',
              isLoss
                ? 'bg-red-500/20 text-red-400'
                : isWinnerDraw
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-brand-primary/10 text-brand-primary'
            )}
          >
            <span className="text-[9px] font-black">{draw.digitsMode}D</span>
          </div>

          <div className="ml-0.5">
            <div className="flex items-center gap-1">
              <h4
                className={cn(
                  'font-black text-[12px] tracking-tight leading-none',
                  isLoss ? 'text-red-100' : isWinnerDraw ? 'text-green-100' : 'text-white'
                )}
              >
                {draw.name}
              </h4>
              {getDrawStatus(draw) === 'closed' && (
                <Lock size={9} className={isLoss ? 'text-red-500/50' : isWinnerDraw ? 'text-green-500/60' : 'text-slate-600'} />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p
                className={cn(
                  'text-[8px] font-bold uppercase tracking-widest',
                  isLoss ? 'text-red-400/60' : isWinnerDraw ? 'text-green-400/70' : 'text-slate-500'
                )}
              >
                {formatAMPM(draw.drawTime)}
              </p>
              {draw.results && draw.results.length > 0 && (
                <div className="flex gap-1">
                  {draw.results.map((res, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        'px-1 py-0.5 rounded-md flex items-center justify-center text-[7px] font-black border',
                        isLoss
                          ? 'bg-red-500/20 text-red-200 border-red-500/30'
                          : isWinnerDraw
                            ? 'bg-green-500/20 text-green-200 border-green-500/30'
                            : idx === 1
                              ? 'bg-slate-800 text-slate-400 border-white/5'
                              : 'bg-brand-primary/20 text-brand-glow border-brand-primary/20'
                      )}
                    >
                      {res}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'px-3 py-1.5 rounded-xl border shadow-inner flex flex-col items-center justify-center min-w-[70px]',
            isLoss
              ? 'bg-red-500/10 border-red-500/20'
              : isWinnerDraw
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-[#0B1220] border-white/5'
          )}
        >
          <p
            className={cn(
              'text-xs font-black leading-none tracking-tight',
              isLoss ? 'text-red-100' : isWinnerDraw ? 'text-green-100' : 'text-white'
            )}
          >
            ${formatCurrency(draw.totalSold)}
          </p>
          {isLoss && (
            <p className="text-[7px] font-bold text-red-400 mt-0.5 text-center uppercase tracking-tighter">Perdida</p>
          )}
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
            <div className={cn('px-2.5 pb-3', isLoss ? 'bg-black/40' : isWinnerDraw ? 'bg-green-950/20' : 'bg-black/20')}>
              <DrawHistoryDetail drawId={draw.id} tickets={draw.tickets} onShare={onShare} isLoss={isLoss} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
