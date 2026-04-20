import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Lock as LockIcon, 
  Wallet, 
  UserCog, 
  Archive, 
  LogOut, 
  X,
  ChevronRight,
  Ticket
} from 'lucide-react';
import { useStore, Page } from '../store/useStore';
import { cn } from '../utils/helpers';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { setCurrentPage, currentPage, currentUser, setCurrentUser } = useStore();

  const menuItems = [
    { id: 'winners', label: 'Ganadores', icon: Trophy, color: 'text-yellow-400' },
    { id: 'closures', label: 'Cierres', icon: LockIcon, color: 'text-blue-400' },
    { id: 'settlement', label: 'Liquidación', icon: Wallet, color: 'text-emerald-400' },
    { id: 'settings', label: 'Configuración', icon: UserCog, color: 'text-purple-400' },
    { id: 'archive', label: 'Archivo', icon: Archive, color: 'text-orange-400' },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      onClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Sidebar Content */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-[280px] bg-[#0B1220] border-r border-white/5 z-[101] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30">
                  <Ticket className="text-brand-primary" size={20} />
                </div>
                <div>
                  <h2 className="text-white font-black text-lg leading-none">LottoPro</h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Panel de Control</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id as Page)}
                  className={cn(
                    "w-full flex items-center justify-between p-3.5 rounded-2xl transition-all group",
                    currentPage === item.id 
                      ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20" 
                      : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      currentPage === item.id ? "bg-brand-primary/20" : "bg-white/5 group-hover:bg-white/10"
                    )}>
                      <item.icon size={20} className={currentPage === item.id ? "text-brand-primary" : item.color} />
                    </div>
                    <span className="font-bold text-sm tracking-tight">{item.label}</span>
                  </div>
                  <ChevronRight size={16} className={cn(
                    "transition-transform",
                    currentPage === item.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                  )} />
                </button>
              ))}
            </div>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-white/5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-all">
                  <LogOut size={20} />
                </div>
                <span className="font-bold text-sm tracking-tight">Salir</span>
              </button>
              <p className="text-center text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-4">
                LottoPro v2.4.0
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
