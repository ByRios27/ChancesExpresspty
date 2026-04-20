import React, { useState } from 'react';
import { useStore, PaleSettings } from '../../store/useStore';
import { Zap, Save, AlertCircle, Info, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { PermissionGuard } from './PermissionGuard';
import { motion } from 'motion/react';

export const PaleSettingsSection: React.FC = () => {
  const { settings, updateSettings } = useStore();
  const defaultPale: PaleSettings = {
    enabled: true,
    minAmount: 0.10,
    maxAmountPerPlay: 5.00,
    globalLimitPerCombination: 5.00,
    payouts: {
      firstSecond: 1000,
      firstThird: 1000,
      secondThird: 200
    }
  };
  const [pale, setPale] = useState<PaleSettings>(settings.pale || defaultPale);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    updateSettings({ pale });
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }, 500);
  };

  const updatePayout = (key: keyof PaleSettings['payouts'], value: string) => {
    const num = parseInt(value, 10) || 0;
    setPale(prev => ({
      ...prev,
      payouts: { ...prev.payouts, [key]: num }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="px-2">
        <h2 className="text-sm font-black text-white uppercase tracking-widest">Configuración de Palé</h2>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Reglas globales y premios</p>
      </div>

      <div className="bg-[#121A2B] rounded-[2rem] border border-white/5 p-6 space-y-6 shadow-2xl">
        {/* Status Toggle */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              pale.enabled ? "bg-brand-primary/10 text-brand-primary" : "bg-slate-800 text-slate-500"
            )}>
              <Zap size={20} />
            </div>
            <div>
              <h4 className="font-black text-sm text-white tracking-tight">Estado del Juego</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Habilitar o deshabilitar ventas</p>
            </div>
          </div>
          <button 
            onClick={() => setPale(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={cn("p-2 transition-all active:scale-90", pale.enabled ? "text-brand-primary" : "text-slate-700")}
          >
            {pale.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
          </button>
        </div>

        {/* Limits Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Info size={12} className="text-brand-primary" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Límites de Venta</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Monto Mínimo</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                <input 
                  type="number"
                  value={pale.minAmount}
                  onChange={(e) => setPale(prev => ({ ...prev, minAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-[#0B1220] border border-white/10 rounded-2xl pl-8 pr-4 py-3 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Máx por Jugada</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                <input 
                  type="number"
                  value={pale.maxAmountPerPlay}
                  onChange={(e) => setPale(prev => ({ ...prev, maxAmountPerPlay: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-[#0B1220] border border-white/10 rounded-2xl pl-8 pr-4 py-3 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Límite Global por Combinación</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
              <input 
                type="number"
                value={pale.globalLimitPerCombination}
                onChange={(e) => setPale(prev => ({ ...prev, globalLimitPerCombination: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-[#0B1220] border border-white/10 rounded-2xl pl-8 pr-4 py-3 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
              />
            </div>
            <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest px-1">
              Monto máximo acumulado entre todos los usuarios para una misma pareja de números.
            </p>
          </div>
        </div>

        {/* Payouts Section */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 px-1">
            <Zap size={12} className="text-brand-primary" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Multiplicadores de Premios</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
              <span className="text-[10px] font-black text-white uppercase tracking-widest">1er y 2do Premio</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px] font-bold">x</span>
                <input 
                  type="number"
                  value={pale.payouts.firstSecond}
                  onChange={(e) => updatePayout('firstSecond', e.target.value)}
                  className="w-20 bg-[#0B1220] border border-white/10 rounded-lg px-2 py-1 text-sm text-white text-center outline-none focus:border-brand-primary/50"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
              <span className="text-[10px] font-black text-white uppercase tracking-widest">1er y 3er Premio</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px] font-bold">x</span>
                <input 
                  type="number"
                  value={pale.payouts.firstThird}
                  onChange={(e) => updatePayout('firstThird', e.target.value)}
                  className="w-20 bg-[#0B1220] border border-white/10 rounded-lg px-2 py-1 text-sm text-white text-center outline-none focus:border-brand-primary/50"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
              <span className="text-[10px] font-black text-white uppercase tracking-widest">2do y 3er Premio</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px] font-bold">x</span>
                <input 
                  type="number"
                  value={pale.payouts.secondThird}
                  onChange={(e) => updatePayout('secondThird', e.target.value)}
                  className="w-20 bg-[#0B1220] border border-white/10 rounded-lg px-2 py-1 text-sm text-white text-center outline-none focus:border-brand-primary/50"
                />
              </div>
            </div>
          </div>
        </div>

        <PermissionGuard allowedRoles={['CEO']}>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "w-full h-14 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl",
              isSaving ? "bg-slate-800 text-slate-500" : "bg-brand-primary text-white shadow-brand-primary/20"
            )}
          >
            <Save size={18} />
            {isSaving ? 'GUARDANDO...' : 'GUARDAR CONFIGURACIÓN'}
          </button>
        </PermissionGuard>
      </div>

      {showSuccess && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="flex items-center justify-center gap-2 text-brand-primary bg-brand-primary/10 p-4 rounded-2xl border border-brand-primary/20"
        >
          <AlertCircle size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Configuración actualizada correctamente</span>
        </motion.div>
      )}
    </div>
  );
};
