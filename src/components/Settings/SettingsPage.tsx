import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Settings, Users, Clock, Zap, ShieldCheck, LogOut, ChevronRight, Lock as LockOut, History } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { DrawsSettingsSection } from './DrawsSettingsSection';
import { UsersSettingsSection } from './UsersSettingsSection';
import { SpecialPlaysSettingsSection } from './SpecialPlaysSettingsSection';
import { PaleSettingsSection } from './PaleSettingsSection';
import { BilleteSettingsSection } from './BilleteSettingsSection';
import { PermissionGuard } from './PermissionGuard';
import { PinValidationModal } from '../PinValidationModal';
import { motion, AnimatePresence } from 'motion/react';
import { PullToRefresh } from '../PullToRefresh';

type SettingsTab = 'draws' | 'users' | 'special' | 'profile';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('draws');
  const { currentUser, resetSalesData, archiveTickets, updateUser } = useStore();
  const [isResetting, setIsResetting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [showPinForm, setShowPinForm] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinAction, setPinAction] = useState<'reset' | 'archive' | null>(null);

  const handleReset = () => {
    setPinAction('reset');
    setIsPinModalOpen(true);
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await resetSalesData();
      alert('Datos de ventas eliminados correctamente.');
    } catch (error) {
      alert('Error al eliminar datos.');
    } finally {
      setIsResetting(false);
      setPinAction(null);
    }
  };

  const handleArchiveClick = () => {
    setPinAction('archive');
    setIsPinModalOpen(true);
  };

  const handleConfirmArchive = async () => {
    setIsArchiving(true);
    try {
      await archiveTickets();
      alert('Resumen diario archivado correctamente.');
    } catch (error) {
      alert('Error al archivar.');
    } finally {
      setIsArchiving(false);
      setPinAction(null);
    }
  };

  const handleUpdatePin = async () => {
    if (!newPin || newPin.length < 4) {
      alert('El PIN debe tener al menos 4 dígitos.');
      return;
    }
    if (currentUser) {
      try {
        await updateUser(currentUser.id, { pin: newPin });
        alert('PIN actualizado correctamente.');
        setNewPin('');
        setShowPinForm(false);
      } catch (error) {
        alert('Error al actualizar PIN.');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0B1220] text-white overflow-hidden">
      {/* Tabs Navigation */}
      <div className="px-4 py-3 bg-[#0B1220] border-b border-white/5">
        <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('draws')}
            className={cn(
              "flex-1 min-w-[80px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'draws' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Clock size={14} />
            Sorteos
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex-1 min-w-[80px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'users' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Users size={14} />
            Usuarios
          </button>
          <button 
            onClick={() => setActiveTab('special')}
            className={cn(
              "flex-1 min-w-[80px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'special' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Zap size={14} />
            Especiales
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex-1 min-w-[80px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'profile' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <ShieldCheck size={14} />
            Perfil
          </button>
        </div>
      </div>

      <PullToRefresh 
        onRefresh={async () => { window.location.reload(); }}
        className="flex-1 px-4 py-6 pb-24"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'draws' && <DrawsSettingsSection />}
            {activeTab === 'users' && <UsersSettingsSection />}
            {activeTab === 'special' && <SpecialPlaysSettingsSection />}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Profile Info */}
                <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-brand-primary/20 flex items-center justify-center text-brand-primary text-2xl font-black">
                      {currentUser?.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-black">{currentUser?.name}</h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{currentUser?.role} • ID: {currentUser?.sellerId}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={() => setShowPinForm(!showPinForm)}
                      className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <LockOut size={18} className="text-slate-400" />
                        <span className="text-sm font-bold">Cambiar PIN / Contraseña</span>
                      </div>
                      <ChevronRight size={16} className="text-slate-600" />
                    </button>

                    {showPinForm && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4"
                      >
                        <input 
                          type="password"
                          placeholder="Nuevo PIN (ej: 1234)"
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          className="w-full bg-[#0B1220] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:border-brand-primary outline-none transition-all"
                        />
                        <button 
                          onClick={handleUpdatePin}
                          className="w-full bg-brand-primary text-black py-3 rounded-xl font-black uppercase tracking-widest text-xs"
                        >
                          Actualizar PIN
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* CEO Actions */}
                {currentUser?.role === 'CEO' && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Acciones de Administrador</h4>
                    
                    <button 
                      onClick={handleArchiveClick}
                      disabled={isArchiving}
                      className="w-full flex items-center gap-4 p-4 bg-orange-400/10 rounded-2xl border border-orange-400/20 text-orange-400 hover:bg-orange-400/20 transition-all disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-400/20 flex items-center justify-center">
                        <History size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black">Archivar Ventas del Día</p>
                        <p className="text-[9px] font-bold opacity-70">Guarda resumen del dia sin borrar ventas</p>
                      </div>
                    </button>

                    <button 
                      onClick={handleReset}
                      disabled={isResetting}
                      className="w-full flex items-center gap-4 p-4 bg-rose-400/10 rounded-2xl border border-rose-400/20 text-rose-400 hover:bg-rose-400/20 transition-all disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-rose-400/20 flex items-center justify-center">
                        <Zap size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black">Borrar Datos de Ventas</p>
                        <p className="text-[9px] font-bold opacity-70">Elimina tickets y resultados (Irreversible)</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Global System Info */}
        <div className="mt-12 pt-6 border-t border-white/5 opacity-50 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck size={12} className="text-brand-primary" />
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">LottoPro System v2.0</span>
          </div>
          <p className="text-[8px] font-black text-brand-primary uppercase tracking-widest mb-1">
            Sesión: {currentUser?.name} ({currentUser?.role})
          </p>
          <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">
            Todos los cambios son auditados y registrados
          </p>
        </div>
      </PullToRefresh>

      <PinValidationModal 
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPinAction(null);
        }}
        onSuccess={pinAction === 'reset' ? handleConfirmReset : handleConfirmArchive}
        title={pinAction === 'reset' ? 'Borrar Datos' : 'Archivar Ventas'}
        description={pinAction === 'reset' 
          ? 'Confirma tu PIN para eliminar todos los datos de ventas.' 
          : 'Confirma tu PIN para archivar el resumen diario sin borrar datos de ventas.'}
      />
    </div>
  );
};




