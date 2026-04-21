import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, AlertCircle, X } from 'lucide-react';
import { useStore } from '../store/useStore';

interface PinValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export const PinValidationModal: React.FC<PinValidationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Validar PIN',
  description = 'Ingresa tu PIN o contraseña para confirmar esta acción.'
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const currentUser = useStore(state => state.currentUser);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (pin === currentUser.pin) {
      onSuccess();
      setPin('');
      setError('');
      onClose();
    } else {
      setError('PIN o contraseña incorrecta');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-[#121A2B] w-full max-w-sm rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    {title}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {description}
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
                    autoFocus
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                    <AlertCircle size={14} />
                    <p className="text-[10px] font-bold uppercase tracking-tighter">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-brand-primary text-black h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 active:scale-95 transition-all"
                >
                  Confirmar
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
