import React, { useState } from 'react';
import { useStore, BilleteSettings, BilletePayouts } from '../../store/useStore';
import { Ticket, Save, AlertCircle, Info, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { PermissionGuard } from './PermissionGuard';
import { motion } from 'motion/react';

export const BilleteSettingsSection: React.FC = () => {
  const { settings, updateSettings } = useStore();
  
  const defaultBillete: BilleteSettings = {
    enabled: true,
    unitPrice: 1.00,
    globalLimitPerNumber: 5,
    payouts: {
      firstPrize: { exact4: 2000, exact3PrefixOrSuffix: 50, exact2PrefixOrSuffix: 3 },
      secondPrize: { exact4: 600, exact3PrefixOrSuffix: 20, exact2PrefixOrSuffix: 2 },
      thirdPrize: { exact4: 300, exact3PrefixOrSuffix: 10, exact2PrefixOrSuffix: 1 }
    }
  };

  const [billete, setBillete] = useState<BilleteSettings>(settings.billete || defaultBillete);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    updateSettings({ billete });
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }, 500);
  };

  const updatePayout = (prizeKey: keyof BilleteSettings['payouts'], fieldKey: keyof BilletePayouts, value: string) => {
    const num = parseFloat(value) || 0;
    setBillete(prev => ({
      ...prev,
      payouts: {
        ...prev.payouts,
        [prizeKey]: {
          ...prev.payouts[prizeKey],
          [fieldKey]: num
        }
      }
    }));
  };

  const renderPrizeSection = (title: string, prizeKey: keyof BilleteSettings['payouts']) => (
    <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
      <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-2">{title}</h4>
      <div className="grid grid-cols-1 gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">4 Cifras Exactas</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[10px] font-bold">$</span>
            <input 
              type="number"
              value={billete.payouts[prizeKey].exact4}
              onChange={(e) => updatePayout(prizeKey, 'exact4', e.target.value)}
              className="w-24 bg-[#0B1220] border border-white/10 rounded-lg px-2 py-1 text-sm text-white text-right outline-none focus:border-brand-primary/50"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">3 Primeros o Últimos</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[10px] font-bold">$</span>
            <input 
              type="number"
              value={billete.payouts[prizeKey].exact3PrefixOrSuffix}
              onChange={(e) => updatePayout(prizeKey, 'exact3PrefixOrSuffix', e.target.value)}
              className="w-24 bg-[#0B1220] border border-white/10 rounded-lg px-2 py-1 text-sm text-white text-right outline-none focus:border-brand-primary/50"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">2 Primeros o Últimos</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[10px] font-bold">$</span>
            <input 
              type="number"
              value={billete.payouts[prizeKey].exact2PrefixOrSuffix}
              onChange={(e) => updatePayout(prizeKey, 'exact2PrefixOrSuffix', e.target.value)}
              className="w-24 bg-[#0B1220] border border-white/10 rounded-lg px-2 py-1 text-sm text-white text-right outline-none focus:border-brand-primary/50"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="px-2">
        <h2 className="text-sm font-black text-white uppercase tracking-widest">Configuración de Billete</h2>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Premios fijos y límites globales</p>
      </div>

      <div className="bg-[#121A2B] rounded-[2rem] border border-white/5 p-6 space-y-6 shadow-2xl">
        {/* Status Toggle */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              billete.enabled ? "bg-brand-primary/10 text-brand-primary" : "bg-slate-800 text-slate-500"
            )}>
              <Ticket size={20} />
            </div>
            <div>
              <h4 className="font-black text-sm text-white tracking-tight">Estado del Juego</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Habilitar o deshabilitar ventas</p>
            </div>
          </div>
          <button 
            onClick={() => setBillete(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={cn("p-2 transition-all active:scale-90", billete.enabled ? "text-brand-primary" : "text-slate-700")}
          >
            {billete.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
          </button>
        </div>

        {/* Global Limits */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Info size={12} className="text-brand-primary" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Reglas de Venta</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Precio Fijo</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                <input 
                  type="number"
                  value={billete.unitPrice}
                  readOnly
                  className="w-full bg-[#0B1220]/50 border border-white/5 rounded-2xl pl-8 pr-4 py-3 text-sm text-slate-500 outline-none cursor-not-allowed"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Límite Global</label>
              <div className="relative">
                <input 
                  type="number"
                  value={billete.globalLimitPerNumber}
                  onChange={(e) => setBillete(prev => ({ ...prev, globalLimitPerNumber: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full bg-[#0B1220] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
                />
              </div>
            </div>
          </div>
          <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest px-1">
            El límite global indica cuántas piezas de un mismo número de 4 cifras pueden venderse en total.
          </p>
        </div>

        {/* Payouts Section */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 px-1">
            <Save size={12} className="text-brand-primary" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tabla de Premiación (por pieza)</span>
          </div>

          <div className="space-y-4">
            {renderPrizeSection('Primer Premio', 'firstPrize')}
            {renderPrizeSection('Segundo Premio', 'secondPrize')}
            {renderPrizeSection('Tercer Premio', 'thirdPrize')}
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
