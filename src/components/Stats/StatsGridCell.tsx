import React from 'react';
import { cn, formatCurrency } from '../../utils/helpers';

interface GridCellProps {
  number: string;
  amount: number;
  isWinner?: boolean;
  position?: '1er' | '2do' | '3er';
  maxAmount: number;
}

export const StatsGridCell: React.FC<GridCellProps> = ({
  number,
  amount,
  isWinner,
  position,
  maxAmount,
}) => {
  // Calculate intensity for heatmap
  const intensity = maxAmount > 0 ? (amount / maxAmount) : 0;
  
  // Define background color based on intensity
  const getBgColor = () => {
    if (isWinner) {
      if (position === '1er') return 'bg-yellow-400/30 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]';
      if (position === '2do') return 'bg-blue-500/30 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]';
      if (position === '3er') return 'bg-orange-500/30 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]';
      return 'bg-yellow-400/30 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]';
    }
    if (amount === 0) return 'bg-white/5 border-white/5';
    
    if (intensity > 0.8) return 'bg-brand-primary/60 border-brand-primary/20';
    if (intensity > 0.5) return 'bg-brand-primary/40 border-brand-primary/10';
    if (intensity > 0.2) return 'bg-brand-primary/20 border-brand-primary/5';
    return 'bg-brand-primary/10 border-brand-primary/5';
  };

  const getTextColor = () => {
    if (isWinner) {
      if (position === '1er') return 'text-yellow-400';
      if (position === '2do') return 'text-blue-400';
      if (position === '3er') return 'text-orange-400';
      return 'text-yellow-400';
    }
    return amount > 0 ? "text-white" : "text-slate-600";
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-1 rounded-md border transition-all duration-300 h-10 w-full relative overflow-hidden",
      getBgColor()
    )}>
      <span className={cn(
        "text-[10px] font-black leading-none mb-0.5",
        getTextColor()
      )}>
        {number}
      </span>
      
      {amount > 0 && (
        <span className={cn(
          "text-[8px] font-bold leading-none",
          isWinner ? getTextColor() : "text-slate-400"
        )}>
          {Math.round(amount)}
        </span>
      )}
    </div>
  );
};
