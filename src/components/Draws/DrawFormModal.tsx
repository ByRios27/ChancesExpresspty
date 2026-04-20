import React, { useState } from 'react';
import { useStore, Draw } from '../../store/useStore';
import { ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import { cn, generateId, formatAMPM, timeToMinutes, minutesToTime } from '../../utils/helpers';
import { motion } from 'motion/react';

interface ModalProps {
  draw: Draw | null;
  onClose: () => void;
}

export const DrawFormModal: React.FC<ModalProps> = ({ draw, onClose }) => {
  const { addDraw, updateDraw, currentUser } = useStore();
  const [name, setName] = useState(draw?.name || '');
  const [drawTime, setDrawTime] = useState(draw?.drawTimeSort ? minutesToTime(draw.drawTimeSort) : '12:00');
  const [closeTime, setCloseTime] = useState(draw?.closeTimeSort ? minutesToTime(draw.closeTimeSort) : '11:55');
  const [digitsMode, setDigitsMode] = useState<2 | 4>(draw?.digitsMode || 2);
  const [paleEnabled, setPaleEnabled] = useState(draw?.allowedSpecialBets?.pale ?? true);
  const [billeteEnabled, setBilleteEnabled] = useState(draw?.allowedSpecialBets?.billete ?? false);
  const [isActive, setIsActive] = useState(draw?.isActive ?? true);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    const drawTimeSort = timeToMinutes(drawTime);
    const closeTimeSort = timeToMinutes(closeTime);

    const drawData = {
      name,
      drawTime: drawTime,
      drawTimeSort,
      closeTime: closeTime,
      closeTimeSort,
      digitsMode,
      allowedSpecialBets: {
        pale: paleEnabled,
        billete: digitsMode === 4 ? billeteEnabled : false
      },
      isActive,
      updatedAt: Date.now(),
      updatedBy: currentUser?.username || 'admin',
    };

    if (draw) {
      updateDraw(draw.id, drawData);
    } else {
      addDraw({
        id: generateId(),
        ...drawData,
        createdAt: Date.now(),
        createdBy: currentUser?.username || 'admin',
      } as Draw);
    }
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#121A2B] w-full max-w-sm rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="p-7">
          <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tight">
            {draw ? 'Editar Sorteo' : 'Nuevo Sorteo'}
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-8">
            Configuración básica del sorteo
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Nombre del Sorteo</label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Real, Nacional..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Hora Sorteo</label>
                <input 
                  type="time"
                  value={drawTime}
                  onChange={(e) => setDrawTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Hora Cierre</label>
                <input 
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Modo de Cifras</label>
              <div className="grid grid-cols-2 gap-3">
                {[2, 4].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDigitsMode(mode as 2 | 4)}
                    className={cn(
                      "py-3 rounded-xl text-xs font-black transition-all border",
                      digitsMode === mode 
                        ? "bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20" 
                        : "bg-white/5 border-white/10 text-slate-500"
                    )}
                  >
                    {mode} CIFRAS
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 px-1">Estado del Sorteo</label>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-[11px] font-black text-white uppercase tracking-tight">Activo</span>
                <button 
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={cn("transition-all active:scale-90", isActive ? "text-brand-primary" : "text-slate-700")}
                >
                  {isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 px-1">Jugadas Especiales</label>
              
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-[11px] font-black text-white uppercase tracking-tight">Palé</span>
                <button 
                  type="button"
                  onClick={() => setPaleEnabled(!paleEnabled)}
                  className={cn("transition-all active:scale-90", paleEnabled ? "text-brand-primary" : "text-slate-700")}
                >
                  {paleEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>

              {digitsMode === 4 && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[11px] font-black text-white uppercase tracking-tight">Billete</span>
                  <button 
                    type="button"
                    onClick={() => setBilleteEnabled(!billeteEnabled)}
                    className={cn("transition-all active:scale-90", billeteEnabled ? "text-brand-primary" : "text-slate-700")}
                  >
                    {billeteEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                <AlertCircle size={14} />
                <p className="text-[10px] font-bold uppercase tracking-tighter">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 bg-white/5 active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white bg-brand-primary shadow-lg shadow-brand-primary/20 active:scale-95 transition-all"
              >
                {draw ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};
