import React from 'react';
import { cn } from '../../utils/helpers';

export type FilterType = 'TODO' | 'CHANCE' | 'BILLETE' | 'PALÉ';

interface FiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export const HistoryFilters: React.FC<FiltersProps> = ({ activeFilter, onFilterChange }) => {
  const filters: FilterType[] = ['TODO', 'CHANCE', 'BILLETE', 'PALÉ'];

  return (
    <div className="flex gap-1.5 mb-3 px-1 overflow-x-auto no-scrollbar">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => onFilterChange(filter)}
          className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border border-[#1E293B]",
            activeFilter === filter 
              ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20" 
              : "bg-[#121A2B] text-slate-500"
          )}
        >
          {filter}
        </button>
      ))}
    </div>
  );
};
