import React, { useState, useMemo } from 'react';
import { useStore, Draw, Ticket, Entry } from '../store/useStore';
import { calculateEntryPrize } from '../utils/prizeCalculator';
import { cn, formatAMPM, sortDrawsByTime, formatCurrency, getPaleParts } from '../utils/helpers';
import { PinValidationModal } from './PinValidationModal';
import { 
  Trophy, 
  ChevronDown, 
  Save, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  Lock as LockIcon,
  Sun,
  Waves,
  Plus,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DrawFormModal } from './Draws/DrawFormModal';
import { PullToRefresh } from './PullToRefresh';
import { calculateTicketPayoutForDraw, calculateTicketSalesForDraw, getEntriesForDraw } from '../utils/ticketUtils';

export const ResultsPage: React.FC = () => {
  const { draws, setResults, removeResults, tickets, currentUser } = useStore();
  
  const [selectedDrawId, setSelectedDrawId] = useState<string | null>(null);
  const [isDrawListOpen, setIsDrawListOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [editingDraw, setEditingDraw] = useState<Draw | null>(null);
  
  const [r1, setR1] = useState('');
  const [r2, setR2] = useState('');
  const [r3, setR3] = useState('');
  
  const [showSuccess, setShowSuccess] = useState(false);

  const sortedDraws = useMemo(() => sortDrawsByTime(draws), [draws]);

  const filteredDraws = useMemo(() => {
    return sortedDraws.filter(draw => {
      const hasResults = draw.results && draw.results.length > 0;
      const hasSales = tickets.some(t => t.drawIds?.includes(draw.id));
      return hasResults || hasSales;
    });
  }, [sortedDraws, tickets]);

  const selectedDraw = useMemo(() => draws.find(d => d.id === selectedDrawId), [draws, selectedDrawId]);
  const resultDigits = selectedDraw?.digitsMode || 2;

  const isCEO = currentUser?.role === 'CEO';

  // Load existing results when draw is selected
  React.useEffect(() => {
    if (selectedDraw && selectedDraw.results) {
      setR1(selectedDraw.results[0] || '');
      setR2(selectedDraw.results[1] || '');
      setR3(selectedDraw.results[2] || '');
    } else {
      setR1('');
      setR2('');
      setR3('');
    }
  }, [selectedDraw]);

  const handleSave = async () => {
    if (!selectedDrawId) return;
    if (r1.length !== resultDigits || r2.length !== resultDigits || r3.length !== resultDigits) return;

    try {
      await setResults(selectedDrawId, [r1, r2, r3]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving draw results:', error);
      alert('No se pudo guardar el resultado en Firestore. Verifica permisos y conexion.');
    }
  };

  const confirmDelete = async () => {
    if (!selectedDrawId) return;
    try {
      await removeResults(selectedDrawId);
      setR1('');
      setR2('');
      setR3('');
    } catch (error) {
      console.error('Error removing draw results:', error);
      alert('No se pudieron eliminar los resultados en Firestore.');
    }
  };

  // Grid Data Calculation
  interface GridItem {
    amount: number;
    count: number;
    prize?: number;
    type?: '1ro' | '2do' | '3ro';
  }

  const gridData = useMemo(() => {
    if (!selectedDrawId) return null;
    
    const data: Record<string, GridItem> = {};
    
    // Initialize 00-99
    for (let i = 0; i < 100; i++) {
      data[i.toString().padStart(2, '0')] = { amount: 0, count: 0 };
    }

    const drawTickets = tickets.filter(t => t.drawIds?.includes(selectedDrawId));
    
    drawTickets.forEach(ticket => {
      getEntriesForDraw(ticket, selectedDrawId).forEach(entry => {
        const amountForDraw = entry.amount;
        const pieces = entry.pieces;

        if (entry.type === 'CHANCE') {
          const num = entry.number.slice(-2);
          if (data[num]) {
            data[num].amount += amountForDraw;
            data[num].count += pieces;
            
            if (selectedDraw?.results && selectedDraw.results.length === 3) {
              const { prize: entryPrize } = calculateEntryPrize(entry, selectedDraw, useStore.getState().settings);
              if (entryPrize > 0) {
                data[num].prize = (data[num].prize || 0) + entryPrize;
              }
            }
          }
        } else if (entry.type === 'PALÉ') {
          const n1 = entry.number.substring(0, 2);
          const n2 = entry.number.substring(2, 4);
          if (data[n1]) {
            data[n1].amount += amountForDraw;
            data[n1].count += pieces;
          }
          if (data[n2]) {
            data[n2].amount += amountForDraw;
            data[n2].count += pieces;
          }
        } else if (entry.type === 'BILLETE') {
          const num = entry.number.slice(-2);
          if (data[num]) {
            data[num].amount += amountForDraw;
            data[num].count += pieces;
          }
        }
      });
    });

    // Mark winners if results exist
    if (selectedDraw?.results && selectedDraw.results.length === 3) {
      const [win1, win2, win3] = selectedDraw.results;
      const w1 = win1.slice(-2);
      const w2 = win2.slice(-2);
      const w3 = win3.slice(-2);

      if (data[w1]) data[w1].type = '1ro';
      if (data[w2]) data[w2].type = '2do';
      if (data[w3]) data[w3].type = '3ro';
    }

    return data;
  }, [selectedDrawId, tickets, selectedDraw]);

  const stats = useMemo(() => {
    if (!selectedDrawId) return { sales: 0, prizes: 0, commission: 0, utility: 0 };
    
    const drawTickets = tickets.filter(t => t.drawIds?.includes(selectedDrawId));
    let sales = 0;
    let prizes = 0;
    let commission = 0;

    const draw = draws.find(d => d.id === selectedDrawId);
    if (!draw) return { sales: 0, prizes: 0, commission: 0, utility: 0 };

    const { users, settings } = useStore.getState();

    drawTickets.forEach(ticket => {
      const ticketSales = calculateTicketSalesForDraw(ticket, selectedDrawId);
      sales += ticketSales;
      
      const seller = users.find(u => u.sellerId === ticket.sellerId);
      const rate = seller ? seller.commission : settings.commissionRate;
      commission += (ticketSales * rate);

      if (draw.results && draw.results.length === 3) {
        prizes += calculateTicketPayoutForDraw(ticket, draw, settings);
      }
    });
    
    return {
      sales,
      prizes,
      commission,
      utility: sales - commission - prizes
    };
  }, [selectedDrawId, tickets, draws]);

  const totalPieces = useMemo(() => {
    if (!selectedDrawId) return 0;
    const drawTickets = tickets.filter(t => t.drawIds?.includes(selectedDrawId));
    
    return drawTickets.reduce((sum, ticket) => {
      return sum + (getEntriesForDraw(ticket, selectedDrawId).reduce((eSum, e) => {
        if (e.type === 'CHANCE') return eSum + e.pieces;
        return eSum;
      }, 0) || 0);
    }, 0);
  }, [selectedDrawId, tickets]);

  const handleResultInput = (val: string, setter: (v: string) => void, nextRef?: React.RefObject<HTMLInputElement>) => {
    const cleanVal = val.replace(/\D/g, '').slice(0, resultDigits);
    setter(cleanVal);
    if (cleanVal.length === resultDigits && nextRef?.current) {
      nextRef.current.focus();
    }
  };

  const r1Ref = React.useRef<HTMLInputElement>(null);
  const r2Ref = React.useRef<HTMLInputElement>(null);
  const r3Ref = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col h-full bg-[#0B1220] text-white select-none overflow-hidden">
      <PullToRefresh 
        onRefresh={async () => { window.location.reload(); }}
        className="flex-1 no-scrollbar pb-24"
      >
        <div className="max-w-md mx-auto p-3 space-y-3">
          {/* Compact Action Card */}
          <div 
            onClick={() => setIsDrawListOpen(true)}
            className="bg-brand-primary rounded-2xl p-4 shadow-lg flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all group overflow-hidden relative"
          >
            <div className="relative z-10">
              <h3 className="font-black text-xs text-white uppercase tracking-widest leading-none">Añadir Resultados</h3>
              <p className="text-[8px] text-white/70 font-bold mt-1 uppercase tracking-tight">Seleccionar sorteo para ingresar números</p>
            </div>
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white relative z-10">
              <Trophy size={16} />
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Sorteos de Hoy</h3>
              {isCEO && (
                <button 
                  onClick={() => {
                    setEditingDraw(null);
                    setIsDrawModalOpen(true);
                  }}
                  className="w-7 h-7 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center hover:bg-brand-primary/20 transition-colors"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {filteredDraws.map((draw) => (
                <div 
                  key={draw.id} 
                  className={cn(
                    "bg-[#121A2B] p-3 rounded-xl border transition-all flex items-center justify-between shadow-md cursor-pointer group relative",
                    selectedDrawId === draw.id ? "border-brand-primary/40 ring-1 ring-brand-primary/20" : "border-white/5 hover:bg-white/10"
                  )}
                  onClick={() => setSelectedDrawId(draw.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      draw.results ? "bg-brand-primary/20 text-brand-primary" : "bg-white/10 text-slate-500"
                    )}>
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white">{draw.name}</p>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{formatAMPM(draw.drawTime)}</p>
                    </div>
                  </div>
                  
                  {draw.results ? (
                    <div className="flex gap-1">
                      {draw.results.map((r, i) => (
                        <div key={i} className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black border",
                          i === 0 ? "bg-yellow-400/20 text-yellow-400 border-yellow-400/30" :
                          i === 1 ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                          "bg-orange-500/20 text-orange-400 border-orange-500/30"
                        )}>
                          {r}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Pendiente</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Draw Input Section */}
          {selectedDraw && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2.5"
            >
              {/* Compact Draw Info */}
              <div className={cn(
                "rounded-2xl p-3 shadow-lg border flex items-center justify-between",
                stats.utility < 0 ? "bg-rose-500/10 border-rose-500/20" : "bg-[#121A2B] border-white/5"
              )}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-slate-400">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-white uppercase tracking-tight">{selectedDraw.name}</h2>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{formatAMPM(selectedDraw.drawTime)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Fracciones</p>
                    <p className="text-base font-black text-white leading-none">
                      {Number.isInteger(totalPieces) ? totalPieces : totalPieces.toFixed(2)}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedDrawId(null)}
                    className="w-8 h-8 rounded-lg bg-white/5 text-slate-500 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Results Input */}
              <div className="bg-[#121A2B] rounded-2xl p-4 border border-white/5 shadow-lg">
                <div className="flex justify-center gap-4 mb-4">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[7px] font-black text-yellow-400 uppercase tracking-widest">1ro</span>
                    <input
                      ref={r1Ref}
                      type="text"
                      inputMode="numeric"
                      value={r1}
                      onChange={(e) => handleResultInput(e.target.value, setR1, r2Ref)}
                      placeholder="--"
                      className={cn(
                        "w-12 h-12 rounded-xl text-center text-lg font-black border-2 transition-all outline-none",
                        r1 ? "bg-yellow-400 text-black border-yellow-400" : "bg-[#0B1220] text-slate-500 border-white/5 focus:border-yellow-400/50"
                      )}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest">2do</span>
                    <input
                      ref={r2Ref}
                      type="text"
                      inputMode="numeric"
                      value={r2}
                      onChange={(e) => handleResultInput(e.target.value, setR2, r3Ref)}
                      placeholder="--"
                      className={cn(
                        "w-12 h-12 rounded-xl text-center text-lg font-black border-2 transition-all outline-none",
                        r2 ? "bg-blue-500 text-black border-blue-500" : "bg-[#0B1220] text-slate-500 border-white/5 focus:border-blue-500/50"
                      )}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[7px] font-black text-orange-500 uppercase tracking-widest">3ro</span>
                    <input
                      ref={r3Ref}
                      type="text"
                      inputMode="numeric"
                      value={r3}
                      onChange={(e) => handleResultInput(e.target.value, setR3)}
                      placeholder="--"
                      className={cn(
                        "w-12 h-12 rounded-xl text-center text-lg font-black border-2 transition-all outline-none",
                        r3 ? "bg-orange-500 text-black border-orange-500" : "bg-[#0B1220] text-slate-500 border-white/5 focus:border-orange-500/50"
                      )}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={!r1 || !r2 || !r3}
                    onClick={handleSave}
                    className="flex-1 bg-brand-primary text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-brand-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save size={14} />
                    {selectedDraw.results ? 'Actualizar' : 'Guardar'}
                  </button>
                  
                  {selectedDraw.results && (
                    <button 
                      onClick={() => setIsPinModalOpen(true)}
                      className="w-12 h-10 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl flex items-center justify-center active:scale-[0.98] transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Stats Preview - Compact */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-[#121A2B] p-2 rounded-xl border border-white/5">
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Ventas</p>
                  <p className="text-[10px] font-black text-white">${formatCurrency(stats.sales)}</p>
                </div>
                <div className="bg-[#121A2B] p-2 rounded-xl border border-white/5">
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Comis</p>
                  <p className="text-[10px] font-black text-blue-400">${formatCurrency(stats.commission)}</p>
                </div>
                <div className="bg-[#121A2B] p-2 rounded-xl border border-white/5">
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Premios</p>
                  <p className="text-[10px] font-black text-rose-400">${formatCurrency(stats.prizes)}</p>
                </div>
                <div className={cn(
                  "p-2 rounded-xl border",
                  stats.utility >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"
                )}>
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Util</p>
                  <p className={cn(
                    "text-[10px] font-black",
                    stats.utility >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>${formatCurrency(stats.utility)}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </PullToRefresh>

      {/* Draw Selection Modal */}
      <AnimatePresence>
        {isDrawListOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawListOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-[#121A2B] w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t sm:border border-white/10 shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Seleccionar Sorteo</h3>
                  <button onClick={() => setIsDrawListOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                  {filteredDraws.map((draw) => (
                    <div 
                      key={draw.id}
                      onClick={() => {
                        setSelectedDrawId(draw.id);
                        setIsDrawListOpen(false);
                      }}
                      className={cn(
                        "p-4 rounded-2xl flex items-center justify-between border transition-all cursor-pointer",
                        selectedDrawId === draw.id 
                          ? "bg-brand-primary/10 border-brand-primary/30" 
                          : "bg-white/5 border-white/5 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          draw.results ? "bg-brand-primary/20 text-brand-primary" : "bg-white/10 text-slate-500"
                        )}>
                          <Clock size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">{draw.name}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{formatAMPM(draw.drawTime)}</p>
                        </div>
                      </div>
                      {draw.results && (
                        <div className="flex gap-1">
                          {draw.results.map((r, i) => (
                            <span key={i} className="w-6 h-6 bg-brand-primary/20 text-brand-primary text-[10px] font-black rounded-lg flex items-center justify-center border border-brand-primary/20">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-brand-primary px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-[100]"
          >
            <CheckCircle2 size={18} className="text-white" />
            <span className="text-xs font-black text-white uppercase tracking-widest">Resultados Guardados</span>
          </motion.div>
        )}
      </AnimatePresence>

      <PinValidationModal 
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={confirmDelete}
        title="Eliminar Resultados"
        description="Confirma tu PIN para eliminar los resultados de este sorteo."
      />

      {/* Draw Management Modal */}
      <AnimatePresence>
        {isDrawModalOpen && (
          <DrawFormModal 
            draw={editingDraw} 
            onClose={() => setIsDrawModalOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
