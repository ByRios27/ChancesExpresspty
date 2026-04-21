import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../utils/helpers';

interface SettlementReceiptProps {
  operatorName?: string;
  date?: string;
  stats: {
    initialFund: number;
    grossSales: number;
    injections: number;
    prizes: number;
    expenses: number;
    commission: number;
    netProfit: number;
    liquidationBalance: number;
  };
}

export const SettlementReceipt: React.FC<SettlementReceiptProps> = ({ 
  operatorName, 
  date, 
  stats 
}) => {
  const isLiquidationPositive = stats.liquidationBalance >= 0;
  const netProfitPanelClass = isLiquidationPositive ? 'bg-emerald-700' : 'bg-rose-700';

  return (
    <div className="w-[600px] bg-white text-slate-900 p-10 font-sans flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">
            L
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">LotteryHub</h1>
        </div>
        <div className="text-right space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Operador: <span className="text-slate-900">{operatorName || 'N/A'}</span></p>
          <p className="text-[10px] font-bold text-slate-500 uppercase">Tel: <span className="text-slate-900">N/A</span></p>
          <p className="text-[10px] font-bold text-slate-500 uppercase">Fecha: <span className="text-slate-900">{date || format(new Date(), "yyyy-MM-dd")}</span></p>
        </div>
      </div>

      {/* Operations Summary */}
      <div>
        <h2 className="text-xl font-black text-slate-900 mb-4">Resumen de Operaciones</h2>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="text-left p-3 text-sm font-black uppercase tracking-widest">Concepto</th>
              <th className="text-right p-3 text-sm font-black uppercase tracking-widest">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <Row label="Fondo Inicial" value={stats.initialFund} />
            <Row label="Ventas Totales Brutas" value={stats.grossSales} />
            <Row label="Inyecciones de Casa Grande" value={stats.injections} />
            <Row label="Premios del Día (Automáticos)" value={stats.prizes} />
            <Row label="Otros Premios / Gastos (Manuales)" value={stats.expenses} isRaw />
            <tr className="bg-slate-50 font-black">
              <td className="p-3 text-sm text-slate-900">Total Premios del Día</td>
              <td className="p-3 text-sm text-right text-slate-900">${formatCurrency(stats.prizes + stats.expenses)}</td>
            </tr>
            <Row label="Tu Comisión" value={stats.commission} />
            <tr className="font-black">
              <td className="p-3 text-sm text-slate-900">Utilidad Final (Casa Grande)</td>
              <td className="p-3 text-sm text-right text-slate-900">${formatCurrency(stats.netProfit)}</td>
            </tr>
            <tr className="font-black">
              <td className="p-3 text-sm text-slate-900">Estado de Liquidacion</td>
              <td className="p-3 text-sm text-right text-slate-900">
                {isLiquidationPositive
                  ? `Saldo positivo (+$${formatCurrency(stats.liquidationBalance)})`
                  : `Perdida de $${formatCurrency(Math.abs(stats.liquidationBalance))}`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Final Settlement */}
      <div className="mt-4">
        <h2 className="text-xl font-black text-slate-900 mb-4">Liquidación Final</h2>
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 p-3 text-center border-b border-slate-200">
            <p className="text-sm font-black text-slate-600 uppercase tracking-widest">Utilidad Final</p>
          </div>
          <div className={`${netProfitPanelClass} p-6 text-center`}>
            <p className="text-4xl font-black text-white">${formatCurrency(stats.netProfit)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: number; isRaw?: boolean }> = ({ label, value, isRaw }) => (
  <tr>
    <td className="p-3 text-sm text-slate-600 font-medium">{label}</td>
    <td className="p-3 text-sm text-right text-slate-900 font-bold">
      {isRaw ? value : `$${formatCurrency(value)}`}
    </td>
  </tr>
);
