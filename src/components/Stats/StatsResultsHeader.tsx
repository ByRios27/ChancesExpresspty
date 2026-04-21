import React from 'react';

interface ResultsHeaderProps {
  results?: string[];
}

export const StatsResultsHeader: React.FC<ResultsHeaderProps> = ({ results }) => {
  if (!results || results.length === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 mb-4 px-2">
      {/* 1er */}
      <div className="flex-1 bg-yellow-400/10 border border-yellow-400/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-lg shadow-yellow-400/5">
        <span className="text-[8px] font-black text-yellow-400 uppercase tracking-widest mb-1 opacity-60">1RO</span>
        <span className="text-xl font-black text-white leading-none tracking-tight">{results[0] || '--'}</span>
      </div>

      {/* 2do */}
      <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-lg shadow-blue-500/5">
        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1 opacity-60">2DO</span>
        <span className="text-xl font-black text-white leading-none tracking-tight">{results[1] || '--'}</span>
      </div>

      {/* 3ro */}
      <div className="flex-1 bg-orange-500/10 border border-orange-500/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-lg shadow-orange-500/5">
        <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest mb-1 opacity-60">3RO</span>
        <span className="text-xl font-black text-white leading-none tracking-tight">{results[2] || '--'}</span>
      </div>
    </div>
  );
};
