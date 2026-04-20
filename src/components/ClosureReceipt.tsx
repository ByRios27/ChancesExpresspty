import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../utils/helpers';

interface ClosureReceiptProps {
  title: string;
  drawName?: string;
  drawTime?: string;
  date?: string;
  operatorName?: string;
  totalPieces: number;
  totalSold: number;
  grid: Record<string, number>; // 00-99 sales
  combinations?: Array<{ type: string; number: string; pieces: number; amount: number }>;
}

export const ClosureReceipt: React.FC<ClosureReceiptProps> = ({
  title,
  drawName,
  drawTime,
  date,
  operatorName,
  totalPieces,
  totalSold,
  grid,
  combinations = [],
}) => {
  const numbers = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
  const GRID_COLUMNS = 5;
  const GRID_ROWS = numbers.length / GRID_COLUMNS;

  // Reorder for vertical columns (5 columns of 20)
  const orderedNumbers: string[] = [];
  for (let i = 0; i < GRID_ROWS; i++) {
    for (let c = 0; c < GRID_COLUMNS; c++) {
      orderedNumbers.push(numbers[i + c * GRID_ROWS]);
    }
  }

  return (
    <div className="w-[600px] bg-white text-slate-900 p-5 font-sans flex flex-col gap-2.5">
      {/* Header */}
      <div className="text-center space-y-0.5">
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">{title}</h1>
        <p className="text-xs font-bold text-slate-600">{drawName} - {drawTime}</p>
        <p className="text-[11px] font-medium text-slate-500">{date || format(new Date(), 'yyyy-MM-dd')}</p>
      </div>

      <div className="border-t border-dashed border-slate-200 pt-2 text-center">
        <p className="text-[10px] font-bold text-slate-500 uppercase">
          Operador: <span className="text-slate-900">{operatorName || 'Administrador'}</span>
        </p>
      </div>

      {/* Summary Boxes */}
      <div className="space-y-2 mt-1">
        <div className="bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-lg flex justify-between items-center">
          <span className="text-xs font-black text-slate-900 uppercase">Total Tiempos:</span>
          <span className="text-lg font-black text-slate-900 leading-none">{totalPieces}</span>
        </div>

        <div className="bg-emerald-500 px-3 py-2.5 rounded-lg flex justify-between items-center">
          <span className="text-xs font-black text-white uppercase tracking-widest">TOTAL VENDIDO:</span>
          <span className="text-xl font-black text-white leading-none">${formatCurrency(totalSold)}</span>
        </div>
      </div>

      {/* Grid Section */}
      <div className="mt-1">
        <div className="text-center mb-2">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">NUMEROS VENDIDOS</h3>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {orderedNumbers.map((num) => (
            <div key={num} className="flex items-center justify-between border border-slate-200 rounded px-1.5 py-1 bg-white leading-none">
              <span className="text-[10px] font-bold text-slate-900">{num}</span>
              <span className="text-[10px] font-black text-emerald-800">{grid[num] ? grid[num] : '-'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sold combinations section */}
      <div className="mt-1">
        <div className="text-center mb-2">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">COMBINACIONES VENDIDAS</h3>
        </div>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-4 bg-slate-900 text-white">
            <div className="px-2 py-1.5 text-[9px] font-black uppercase tracking-wider">Tipo</div>
            <div className="px-2 py-1.5 text-[9px] font-black uppercase tracking-wider">Combinacion</div>
            <div className="px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-right">Tiempos</div>
            <div className="px-2 py-1.5 text-[9px] font-black uppercase tracking-wider text-right">Monto</div>
          </div>
          {combinations.length > 0 ? (
            combinations.map((item, idx) => (
              <div key={`${item.type}-${item.number}-${idx}`} className="grid grid-cols-4 border-t border-slate-100">
                <div className="px-2 py-1.5 text-[10px] font-bold text-slate-700">{item.type}</div>
                <div className="px-2 py-1.5 text-[10px] font-bold text-slate-900">{item.number}</div>
                <div className="px-2 py-1.5 text-[10px] font-black text-emerald-800 text-right">{item.pieces}</div>
                <div className="px-2 py-1.5 text-[10px] font-black text-slate-900 text-right">${formatCurrency(item.amount)}</div>
              </div>
            ))
          ) : (
            <div className="p-2.5 text-[10px] font-bold text-slate-500 text-center border-t border-slate-100">
              No hay combinaciones especiales vendidas para este sorteo.
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-1 pt-2 border-t border-slate-100 text-center">
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
          Generado el {format(new Date(), 'd/M/yyyy, h:mm:ss a', { locale: es })}
        </p>
      </div>
    </div>
  );
};
