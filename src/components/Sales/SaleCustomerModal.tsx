import React, { useState } from 'react';
import { User, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Entry } from '../../store/useStore';
import { formatCurrency, formatPlayNumberForDisplay } from '../../utils/helpers';

interface SalePreviewGroup {
  drawId: string;
  drawName: string;
  entries: Entry[];
  subtotal: number;
}

interface SaleCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customerName: string) => void | Promise<void>;
  isSubmitting?: boolean;
  initialName?: string;
  previewGroups: SalePreviewGroup[];
  totalAmount: number;
  isEditing?: boolean;
}

export const SaleCustomerModal: React.FC<SaleCustomerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  initialName = '',
  previewGroups,
  totalAmount,
  isEditing = false,
}) => {
  const [name, setName] = useState(initialName);
  const [isConfirming, setIsConfirming] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName(initialName);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const totalLines = previewGroups.reduce((sum, group) => sum + group.entries.length, 0);

  const getEntryTypeAbbr = (type: Entry['type']): 'CH' | 'PL' | 'BL' => {
    if (type === 'PALÉ') return 'PL';
    if (type === 'BILLETE') return 'BL';
    return 'CH';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || isConfirming) return;

    setIsConfirming(true);
    try {
      await onConfirm(name.trim());
      setName('');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#121A2B] w-full max-w-sm rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden"
        >
          <div className="p-6 max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-brand-primary/20 p-2 rounded-xl">
                  <User size={20} className="text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Confirmar Ticket</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Nombre + previsualizacion</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting || isConfirming} className="text-slate-500 hover:text-white transition-colors disabled:opacity-40">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre del cliente (opcional)</label>
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Juan Perez"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold placeholder:text-slate-600 focus:outline-none focus:border-brand-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previsualizacion del ticket</p>
                  <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{totalLines} lineas</p>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto no-scrollbar pr-1">
                  {previewGroups.map((group) => (
                    <div key={group.drawId} className="bg-[#0B1220] border border-white/5 rounded-xl p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-white uppercase tracking-wider">{group.drawName}</p>
                        <p className="text-[9px] font-black text-brand-primary">${formatCurrency(group.subtotal)}</p>
                      </div>
                      <div className="space-y-1.5">
                        {group.entries.map((entry, idx) => (
                          <div key={`${group.drawId}-${entry.id || idx}`} className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-white tracking-widest">{formatPlayNumberForDisplay(entry.number, entry.type)}</span>
                              <span className="font-bold text-slate-500 uppercase">{getEntryTypeAbbr(entry.type)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-slate-300">x{entry.pieces}</span>
                              <span className="font-black text-brand-primary">${formatCurrency(entry.amount)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                  <p className="text-sm font-black text-brand-primary">${formatCurrency(totalAmount)}</p>
                </div>
              </div>

              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                  Si se deja vacio, el sistema asignara automaticamente <span className="text-brand-primary font-bold">CLIENTE GENERAL</span> con una secuencia unica.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isConfirming}
                className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/20 active:scale-[0.98] transition-all"
              >
                {(isSubmitting || isConfirming) ? 'Procesando...' : (isEditing ? 'Confirmar Actualizacion' : 'Confirmar Venta')}
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
