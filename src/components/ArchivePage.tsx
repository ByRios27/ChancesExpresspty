import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { formatCurrency } from '../utils/helpers';
import { Calendar, History } from 'lucide-react';

interface ArchiveDayTotals {
  totalSales: number;
  totalCommission: number;
  totalPrizes: number;
  totalUtility: number;
  totalCapitalInjection?: number;
  totalTickets?: number;
}

interface ArchiveDayEntry {
  id: string;
  businessDate: string;
  timezone?: string;
  sourceVersion?: string;
  totals: ArchiveDayTotals;
}

type ArchiveMode = 'single' | 'range';

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function safeNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatDateLabel(dateString: string): string {
  if (!dateString) return '--';
  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateString;
  return parsed.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const ArchivePage: React.FC = () => {
  const [archives, setArchives] = useState<ArchiveDayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ArchiveMode>('single');

  const today = toDateInputValue(new Date());
  const [singleDate, setSingleDate] = useState(today);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  useEffect(() => {
    const q = query(collection(db, 'archivesDaily'), orderBy('businessDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => {
        const raw = docSnap.data() as any;
        const totalsRaw = raw?.totals || {};
        const totalSales = safeNumber(totalsRaw.totalSales);
        const totalCommission = safeNumber(totalsRaw.totalCommission);
        const totalPrizes = safeNumber(totalsRaw.totalPrizes);
        const fallbackUtility = totalSales - totalCommission - totalPrizes + safeNumber(totalsRaw.totalCapitalInjection);

        return {
          id: docSnap.id,
          businessDate: raw?.businessDate || docSnap.id,
          timezone: raw?.timezone,
          sourceVersion: raw?.sourceVersion,
          totals: {
            totalSales,
            totalCommission,
            totalPrizes,
            totalUtility: Number(safeNumber(totalsRaw.totalUtility || fallbackUtility).toFixed(2)),
            totalCapitalInjection: safeNumber(totalsRaw.totalCapitalInjection),
            totalTickets: safeNumber(totalsRaw.totalTickets),
          },
        } as ArchiveDayEntry;
      });

      setArchives(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const selectedEntries = useMemo(() => {
    if (mode === 'single') {
      return archives.filter((item) => item.businessDate === singleDate);
    }

    const start = fromDate <= toDate ? fromDate : toDate;
    const end = fromDate <= toDate ? toDate : fromDate;

    return archives.filter((item) => item.businessDate >= start && item.businessDate <= end);
  }, [archives, mode, singleDate, fromDate, toDate]);

  const accumulated = useMemo(() => {
    return selectedEntries.reduce(
      (acc, item) => {
        acc.totalSales += safeNumber(item.totals.totalSales);
        acc.totalCommission += safeNumber(item.totals.totalCommission);
        acc.totalPrizes += safeNumber(item.totals.totalPrizes);
        acc.totalUtility += safeNumber(item.totals.totalUtility);
        return acc;
      },
      { totalSales: 0, totalCommission: 0, totalPrizes: 0, totalUtility: 0 }
    );
  }, [selectedEntries]);

  return (
    <div className="h-full flex flex-col bg-[#0B1220] text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 pb-24">
        <div className="bg-[#121A2B] rounded-xl p-3 border border-white/5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('single')}
              className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                mode === 'single'
                  ? 'bg-brand-primary/20 border-brand-primary/40 text-brand-primary'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              Por fecha
            </button>
            <button
              onClick={() => setMode('range')}
              className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                mode === 'range'
                  ? 'bg-brand-primary/20 border-brand-primary/40 text-brand-primary'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              Acumulado
            </button>
          </div>

          {mode === 'single' ? (
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Fecha</label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-slate-200 outline-none"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Desde</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-slate-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Hasta</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-[#0B1220] border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-slate-200 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#121A2B] rounded-xl p-3 border border-white/5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Resumen seleccionado</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-lg p-2 border border-white/5">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Ventas</p>
              <p className="text-sm font-black text-brand-primary">${formatCurrency(accumulated.totalSales)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2 border border-white/5">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Comision</p>
              <p className="text-sm font-black text-amber-400">${formatCurrency(accumulated.totalCommission)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2 border border-white/5">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Premios</p>
              <p className="text-sm font-black text-rose-400">${formatCurrency(accumulated.totalPrizes)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2 border border-white/5">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Utilidad</p>
              <p className="text-sm font-black text-emerald-400">${formatCurrency(accumulated.totalUtility)}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : selectedEntries.length === 0 ? (
          <div className="bg-white/5 rounded-2xl p-12 flex flex-col items-center justify-center text-center border border-dashed border-white/10 opacity-40">
            <History size={32} className="text-slate-600 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">No hay archivos para ese filtro</p>
          </div>
        ) : (
          selectedEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-[#121A2B] rounded-xl p-3 border border-white/5 flex items-start justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center text-orange-400">
                  <Calendar size={18} />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-white uppercase tracking-tight">
                    {formatDateLabel(entry.businessDate)}
                  </h4>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                    Ventas ${formatCurrency(entry.totals.totalSales)} | Comision ${formatCurrency(entry.totals.totalCommission)}
                  </p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                    Premios ${formatCurrency(entry.totals.totalPrizes)} | Utilidad ${formatCurrency(entry.totals.totalUtility)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
