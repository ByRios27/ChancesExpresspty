import React, { useState } from 'react';
import { useStore, Draw, DrawStatus } from '../../store/useStore';
import { Plus, Edit2, Trash2, Clock, ToggleLeft, ToggleRight, AlertCircle, Zap, Save } from 'lucide-react';
import { cn, generateId, formatAMPM, sortDrawsByTime, timeToMinutes, minutesToTime } from '../../utils/helpers';
import { PermissionGuard } from './PermissionGuard';
import { motion, AnimatePresence } from 'motion/react';
import { DrawFormModal } from '../Draws/DrawFormModal';

export const DrawsSettingsSection: React.FC = () => {
  const { draws, addDraw, updateDraw, deleteDraw } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDraw, setEditingDraw] = useState<Draw | null>(null);

  const sortedDraws = sortDrawsByTime(draws);
  const { settings, updateSettings } = useStore();
  const [pricePerTime, setPricePerTime] = useState(settings.pricePerTime?.toString() || '1');
  const [chancePayouts, setChancePayouts] = useState({
    first: settings.chance?.payouts?.first?.toString() || '60',
    second: settings.chance?.payouts?.second?.toString() || '8',
    third: settings.chance?.payouts?.third?.toString() || '4'
  });
  const [palePayouts, setPalePayouts] = useState({
    firstSecond: settings.pale?.payouts?.firstSecond?.toString() || '1000',
    firstThird: settings.pale?.payouts?.firstThird?.toString() || '1000',
    secondThird: settings.pale?.payouts?.secondThird?.toString() || '200'
  });

  const handleOpenModal = (draw?: Draw) => {
    setEditingDraw(draw || null);
    setIsModalOpen(true);
  };

  const handleUpdateGeneral = () => {
    const val = parseFloat(pricePerTime);
    const first = parseFloat(chancePayouts.first);
    const second = parseFloat(chancePayouts.second);
    const third = parseFloat(chancePayouts.third);
    const p12 = parseFloat(palePayouts.firstSecond);
    const p13 = parseFloat(palePayouts.firstThird);
    const p23 = parseFloat(palePayouts.secondThird);

    if (!isNaN(val) && val > 0 && !isNaN(first) && !isNaN(second) && !isNaN(third) && !isNaN(p12) && !isNaN(p13) && !isNaN(p23)) {
      updateSettings({ 
        pricePerTime: val,
        chance: {
          ...settings.chance,
          payouts: { first, second, third }
        },
        pale: {
          ...settings.pale,
          payouts: { firstSecond: p12, firstThird: p13, secondThird: p23 }
        }
      });
      alert('Configuración general actualizada.');
    }
  };

  return (
    <div className="space-y-6">
      {/* General Settings Card */}
      <PermissionGuard allowedRoles={['CEO']}>
        <div className="bg-[#121A2B] rounded-3xl border border-white/5 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Configuración General</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Ajustes globales del sistema</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Valor por Tiempo (RD$)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                <input 
                  type="number"
                  step="0.01"
                  value={pricePerTime}
                  onChange={(e) => setPricePerTime(e.target.value)}
                  className="w-full bg-[#0B1220] border border-white/10 rounded-2xl pl-8 pr-4 py-4 text-sm font-black text-white outline-none focus:border-brand-primary/50 transition-all"
                />
              </div>
              <p className="mt-2 text-[9px] text-slate-600 font-bold uppercase tracking-tight px-1">
                Define cuánto cuesta cada "tiempo" en las jugadas de Chance.
              </p>
            </div>

            <div className="pt-4 border-t border-white/5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">Premios de Chance (x1)</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="block text-[8px] font-black text-yellow-400 uppercase tracking-widest mb-1.5 text-center">1ro</span>
                  <input 
                    type="number"
                    value={chancePayouts.first}
                    onChange={(e) => setChancePayouts({ ...chancePayouts, first: e.target.value })}
                    className="w-full bg-[#0B1220] border border-white/10 rounded-xl px-2 py-3 text-center text-sm font-black text-white outline-none focus:border-yellow-400/50 transition-all"
                  />
                </div>
                <div>
                  <span className="block text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1.5 text-center">2do</span>
                  <input 
                    type="number"
                    value={chancePayouts.second}
                    onChange={(e) => setChancePayouts({ ...chancePayouts, second: e.target.value })}
                    className="w-full bg-[#0B1220] border border-white/10 rounded-xl px-2 py-3 text-center text-sm font-black text-white outline-none focus:border-blue-400/50 transition-all"
                  />
                </div>
                <div>
                  <span className="block text-[8px] font-black text-orange-400 uppercase tracking-widest mb-1.5 text-center">3ro</span>
                  <input 
                    type="number"
                    value={chancePayouts.third}
                    onChange={(e) => setChancePayouts({ ...chancePayouts, third: e.target.value })}
                    className="w-full bg-[#0B1220] border border-white/10 rounded-xl px-2 py-3 text-center text-sm font-black text-white outline-none focus:border-orange-400/50 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">Premios de Palé (x1)</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="block text-[8px] font-black text-brand-primary uppercase tracking-widest mb-1.5 text-center">1ro-2do</span>
                  <input 
                    type="number"
                    value={palePayouts.firstSecond}
                    onChange={(e) => setPalePayouts({ ...palePayouts, firstSecond: e.target.value })}
                    className="w-full bg-[#0B1220] border border-white/10 rounded-xl px-2 py-3 text-center text-sm font-black text-white outline-none focus:border-brand-primary/50 transition-all"
                  />
                </div>
                <div>
                  <span className="block text-[8px] font-black text-brand-primary uppercase tracking-widest mb-1.5 text-center">1ro-3ro</span>
                  <input 
                    type="number"
                    value={palePayouts.firstThird}
                    onChange={(e) => setPalePayouts({ ...palePayouts, firstThird: e.target.value })}
                    className="w-full bg-[#0B1220] border border-white/10 rounded-xl px-2 py-3 text-center text-sm font-black text-white outline-none focus:border-brand-primary/50 transition-all"
                  />
                </div>
                <div>
                  <span className="block text-[8px] font-black text-brand-primary uppercase tracking-widest mb-1.5 text-center">2do-3ro</span>
                  <input 
                    type="number"
                    value={palePayouts.secondThird}
                    onChange={(e) => setPalePayouts({ ...palePayouts, secondThird: e.target.value })}
                    className="w-full bg-[#0B1220] border border-white/10 rounded-xl px-2 py-3 text-center text-sm font-black text-white outline-none focus:border-brand-primary/50 transition-all"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleUpdateGeneral}
              className="w-full bg-brand-primary text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-brand-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Save size={16} />
              Guardar Configuración
            </button>
          </div>
        </div>
      </PermissionGuard>

      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Gestión de Sorteos</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Configura horarios y estados</p>
        </div>
        <PermissionGuard 
          allowedRoles={['CEO']}
          fallback={
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3">
              <AlertCircle size={16} className="text-blue-400" />
              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Acceso restringido: Se requiere rol CEO</p>
            </div>
          }
        >
          <button 
            onClick={() => handleOpenModal()}
            className="bg-brand-primary text-white p-2 rounded-xl shadow-lg shadow-brand-primary/20 active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </PermissionGuard>
      </div>

      <div className="space-y-2">
        {sortedDraws.map((draw) => (
          <motion.div 
            layout
            key={draw.id} 
            className={cn(
              "bg-[#121A2B] rounded-2xl border p-4 flex items-center justify-between transition-all",
              draw.isActive ? "border-white/5" : "border-red-500/20 opacity-70"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black",
                draw.isActive ? "bg-brand-primary/10 text-brand-primary" : "bg-red-500/10 text-red-500"
              )}>
                {draw.digitsMode} DIG
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm text-white tracking-tight">{draw.name}</h4>
                  {!draw.isActive && (
                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-500 text-[7px] font-black uppercase tracking-widest rounded border border-red-500/20">
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    Sorteo: {formatAMPM(draw.drawTime)}
                  </p>
                  <p className="text-[10px] text-red-500/70 font-bold uppercase tracking-widest">
                    Cierre: {formatAMPM(draw.closeTime)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <PermissionGuard allowedRoles={['CEO']}>
                <button 
                  onClick={() => updateDraw(draw.id, { isActive: !draw.isActive })}
                  className={cn("p-2 transition-all active:scale-90", draw.isActive ? "text-brand-primary" : "text-slate-700")}
                >
                  {draw.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
                <button 
                  onClick={() => handleOpenModal(draw)}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => deleteDraw(draw.id)}
                  className="p-2 text-slate-700 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </PermissionGuard>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <DrawFormModal 
            draw={editingDraw} 
            onClose={() => setIsModalOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
