import React, { useEffect, useMemo, useState } from 'react';
import { Layers, Check, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Draw } from '../../store/useStore';
import { cn, formatAMPM } from '../../utils/helpers';

interface ReuseDrawSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (drawIds: string[]) => void;
  activeDraws: Draw[];
}

export const ReuseDrawSelectionModal: React.FC<ReuseDrawSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  activeDraws 
}) => {
  const activeDrawIds = useMemo(() => activeDraws.map((draw) => draw.id), [activeDraws]);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    activeDrawIds[0] ? [activeDrawIds[0]] : []
  );

  useEffect(() => {
    if (!isOpen) return;

    setSelectedIds((prev) => {
      const validSelected = prev.filter((id) => activeDrawIds.includes(id));
      if (validSelected.length > 0) return validSelected;
      return activeDrawIds[0] ? [activeDrawIds[0]] : [];
    });
  }, [isOpen, activeDrawIds]);

  const validSelectedIds = selectedIds.filter((id) => activeDrawIds.includes(id));

  if (!isOpen) return null;

  const toggleDraw = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Must select at least one
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  };

  const handleConfirm = () => {
    if (validSelectedIds.length > 0) {
      onConfirm(validSelectedIds);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#121A2B] w-full max-w-sm rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden"
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-brand-primary/20 p-2 rounded-xl">
                  <Layers size={20} className="text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Reutilizar Jugada</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Seleccione los sorteos</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar mb-6">
              {activeDraws.length > 0 ? (
                activeDraws.map((draw) => (
                  <button
                    key={draw.id}
                    onClick={() => toggleDraw(draw.id)}
                    className={cn(
                      "w-full p-4 rounded-2xl flex items-center justify-between border transition-all duration-300",
                      selectedIds.includes(draw.id) 
                        ? "bg-brand-primary/10 border-brand-primary/40 shadow-lg shadow-brand-primary/5" 
                        : "bg-white/5 border-white/5 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black",
                        selectedIds.includes(draw.id) ? "bg-brand-primary text-white" : "bg-white/10 text-slate-400"
                      )}>
                        {draw.digitsMode}D
                      </div>
                      <div className="text-left">
                        <p className={cn(
                          "text-sm font-black tracking-tight leading-none",
                          selectedIds.includes(draw.id) ? "text-white" : "text-slate-400"
                        )}>{draw.name}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">{formatAMPM(draw.drawTime)}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center transition-all",
                      selectedIds.includes(draw.id) 
                        ? "bg-brand-primary border-brand-primary" 
                        : "border-white/10"
                    )}>
                      {selectedIds.includes(draw.id) && <Check size={14} className="text-white" />}
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-8 text-center opacity-40">
                  <p className="text-xs font-bold uppercase tracking-widest">No hay sorteos activos disponibles</p>
                </div>
              )}
            </div>

            <button
              onClick={handleConfirm}
              disabled={validSelectedIds.length === 0}
              className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/20 active:scale-[0.98] transition-all disabled:opacity-20"
            >
              Confirmar Selección
              <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
