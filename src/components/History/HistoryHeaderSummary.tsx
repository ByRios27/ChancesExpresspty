import React from 'react';
import { Menu, LogOut } from 'lucide-react';
import { cn, formatCurrency } from '../../utils/helpers';

interface SummaryProps {
  totalSales: number;
  totalCommission: number;
  totalPrizes: number;
  utility: number;
}

export const HistoryHeaderSummary: React.FC<SummaryProps> = ({
  totalSales,
  totalCommission,
  totalPrizes,
  utility,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#0B1220] border-b border-white/5 h-[65px] flex items-center px-2 shadow-xl">
      {/* Left: Menu Icon */}
      <button className="text-white opacity-80 hover:opacity-100 transition-opacity p-2">
        <Menu size={20} />
      </button>

      {/* Center: Metrics Blocks */}
      <div className="flex-1 flex items-center justify-around px-1">
        {/* Ventas */}
        <div className="flex flex-col items-center px-1">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Ventas</span>
          <p className="text-[13px] font-black text-white leading-none tracking-tight">
            ${formatCurrency(totalSales)}
          </p>
        </div>

        {/* Separator */}
        <div className="h-6 w-[1px] bg-[#1E293B]" />

        {/* Comisión */}
        <div className="flex flex-col items-center px-1">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Comisión</span>
          <p className="text-[13px] font-black text-orange-400 leading-none tracking-tight">
            ${formatCurrency(totalCommission)}
          </p>
        </div>

        {/* Separator */}
        <div className="h-6 w-[1px] bg-[#1E293B]" />

        {/* Premios */}
        <div className="flex flex-col items-center px-1">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Premios</span>
          <p className="text-[13px] font-black text-red-500 leading-none tracking-tight">
            ${formatCurrency(totalPrizes)}
          </p>
        </div>

        {/* Separator */}
        <div className="h-6 w-[1px] bg-[#1E293B]" />

        {/* Utilidad */}
        <div className="flex flex-col items-center px-1">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Utilidad</span>
          <p className={cn(
            "text-[13px] font-black leading-none tracking-tight",
            utility < 0 ? "text-red-500" : "text-[#22C55E]"
          )}>
            ${formatCurrency(utility)}
          </p>
        </div>
      </div>

      {/* Right: Logout Icon */}
      <button className="text-white opacity-80 hover:opacity-100 transition-opacity p-2">
        <LogOut size={18} />
      </button>
    </header>
  );
};
