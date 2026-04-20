import React, { useState, useMemo } from 'react';
import { useStore, User, UserRole } from '../../store/useStore';
import { Plus, Edit2, Trash2, User as UserIcon, Shield, Percent, ToggleLeft, ToggleRight, AlertCircle, TrendingUp } from 'lucide-react';
import { cn, generateSellerId } from '../../utils/helpers';
import { PermissionGuard } from './PermissionGuard';
import { PinValidationModal } from '../PinValidationModal';
import { motion, AnimatePresence } from 'motion/react';
import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, inMemoryPersistence, initializeAuth, signOut } from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';

export const UsersSettingsSection: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, currentUser } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const handleOpenModal = (user?: User) => {
    setEditingUser(user || null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setUserToDelete(id);
    setIsPinModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete);
      setUserToDelete(null);
    }
  };

  const [selectedUserId, setSelectedUserId] = useState('');
  const [injectionAmount, setInjectionAmount] = useState('');

  const handleSaveInjection = () => {
    if (!selectedUserId || !injectionAmount) return;
    const amount = parseFloat(injectionAmount);
    if (isNaN(amount) || amount <= 0) return;

    // Check both users list and currentUser
    const user = users.find(u => u.id === selectedUserId) || (currentUser?.id === selectedUserId ? currentUser : null);
    
    if (user) {
      const currentInjection = user.capitalInjection || 0;
      updateUser(user.id, { capitalInjection: currentInjection + amount });
      setInjectionAmount('');
      setSelectedUserId('');
    }
  };

  // Combine users list with currentUser to ensure current user is always selectable
  const allSelectableUsers = useMemo(() => {
    const list = [...users];
    if (currentUser && !list.find(u => u.id === currentUser.id)) {
      list.push(currentUser);
    }
    return list;
  }, [users, currentUser]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-sm font-black text-white uppercase tracking-widest">GestiÃ³n de Usuarios</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Administra roles y comisiones</p>
        </div>
        <PermissionGuard allowedRoles={['CEO']}>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-brand-primary text-white p-2 rounded-xl shadow-lg shadow-brand-primary/20 active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </PermissionGuard>
      </div>

      {/* Capital Injection Section */}
      <PermissionGuard allowedRoles={['CEO']}>
        <div className="bg-[#121A2B] rounded-2xl border border-brand-primary/20 p-4 space-y-3 mx-2">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-brand-primary" />
            <h3 className="text-[10px] font-black text-brand-primary uppercase tracking-widest">I. Capital (InyecciÃ³n)</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select 
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-brand-primary/50 transition-colors appearance-none"
            >
              <option value="">Seleccionar Usuario</option>
              {allSelectableUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} (@{u.username}) {u.id === currentUser?.id ? '(MÃ­ mismo)' : ''}
                </option>
              ))}
            </select>
            <input 
              type="number"
              value={injectionAmount}
              onChange={(e) => setInjectionAmount(e.target.value)}
              placeholder="Monto $"
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-brand-primary/50 transition-colors"
            />
          </div>
          <button 
            onClick={handleSaveInjection}
            disabled={!selectedUserId || !injectionAmount}
            className="w-full py-2.5 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            Guardar InyecciÃ³n
          </button>
        </div>
      </PermissionGuard>

      <div className="space-y-2">
        {users.map((user) => (
          <motion.div 
            layout
            key={user.id} 
            className={cn(
              "bg-[#121A2B] rounded-2xl border p-4 flex items-center justify-between transition-all",
              user.status === 'active' ? "border-white/5" : "border-red-500/20 opacity-70"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                user.role === 'CEO' ? "bg-brand-primary/10 text-brand-primary" : "bg-slate-800 text-slate-400"
              )}>
                <UserIcon size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm text-white tracking-tight">{user.name}</h4>
                  <span className={cn(
                    "px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest rounded border",
                    user.role === 'CEO' ? "bg-brand-primary/20 text-brand-primary border-brand-primary/20" : "bg-slate-800 text-slate-500 border-white/5"
                  )}>
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">@{user.username}</p>
                  <div className="flex items-center gap-1 text-brand-primary">
                    <Percent size={10} />
                    <p className="text-[9px] font-black uppercase tracking-widest">{(user.commission * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <PermissionGuard allowedRoles={['CEO']}>
                <button 
                  onClick={() => updateUser(user.id, { status: user.status === 'active' ? 'inactive' : 'active' })}
                  className={cn("p-2 transition-all active:scale-90", user.status === 'active' ? "text-brand-primary" : "text-slate-700")}
                >
                  {user.status === 'active' ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
                <button 
                  onClick={() => handleOpenModal(user)}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                {user.role !== 'CEO' && (
                  <button 
                    onClick={() => handleDeleteClick(user.id)}
                    className="p-2 text-slate-700 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </PermissionGuard>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <UserFormModal 
            user={editingUser} 
            onClose={() => setIsModalOpen(false)} 
          />
        )}
      </AnimatePresence>

      <PinValidationModal 
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setUserToDelete(null);
        }}
        onSuccess={handleConfirmDelete}
        title="Eliminar Usuario"
        description="Confirma tu PIN para eliminar este usuario."
      />
    </div>
  );
};

interface ModalProps {
  user: User | null;
  onClose: () => void;
}

async function createLoginAccount(email: string, password: string): Promise<string> {
  const appName = `lottopro-user-provision-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig as any, appName);
  const secondaryAuth = initializeAuth(secondaryApp, { persistence: inMemoryPersistence });

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return credential.user.uid;
  } finally {
    await signOut(secondaryAuth).catch(() => undefined);
    await deleteApp(secondaryApp).catch(() => undefined);
  }
}

const UserFormModal: React.FC<ModalProps> = ({ user, onClose }) => {
  const { addUser, updateUser } = useStore();
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'VENDEDOR');
  const [commission, setCommission] = useState(user?.commission ? (user.commission * 100).toString() : '20');
  const [sellerId, setSellerId] = useState(user?.sellerId || generateSellerId());
  const [pin, setPin] = useState(user?.pin || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!username.trim()) {
      setError('El usuario es obligatorio');
      return;
    }
    if (!pin.trim()) {
      setError('El PIN interno es obligatorio');
      return;
    }

    if (!user) {
      if (!email.trim()) {
        setError('El correo electrónico es obligatorio para crear login.');
        return;
      }
      if (!loginPassword.trim() || loginPassword.trim().length < 6) {
        setError('La contraseña de login debe tener al menos 6 caracteres.');
        return;
      }
    }

    const commissionValue = parseFloat(commission) / 100;
    setIsSaving(true);

    try {
      if (user) {
        updateUser(user.id, { name, username, email, role, commission: commissionValue, sellerId, pin });
      } else {
        const uid = await createLoginAccount(email.trim(), loginPassword.trim());
        addUser({
          id: uid,
          name,
          username,
          email: email.trim(),
          role,
          status: 'active',
          commission: commissionValue,
          sellerId,
          pin,
        });
      }
      onClose();
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        setError('Ese correo ya está registrado para login.');
      } else if (err?.code === 'auth/invalid-email') {
        setError('Correo inválido.');
      } else if (err?.code === 'auth/weak-password') {
        setError('La contraseña de login es demasiado débil.');
      } else {
        setError('No se pudo crear el login del usuario.');
      }
    } finally {
      setIsSaving(false);
    }
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
        className="bg-[#121A2B] w-full max-w-sm rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          <h3 className="text-lg font-black text-white mb-1 uppercase tracking-tight">
            {user ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">
            Configura acceso y comisión
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Nombre Completo</label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Correo Electrónico</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@correo.com"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Usuario / Login</label>
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. jperez123"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">ID Vendedor</label>
                <input 
                  type="text"
                  value={sellerId}
                  onChange={(e) => setSellerId(e.target.value)}
                  placeholder="Ej. 9584"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">PIN Interno</label>
                <input 
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
                />
              </div>
            </div>

            {!user && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Contraseña Login</label>
                <input 
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Rol</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors appearance-none"
                >
                  <option value="CEO">CEO</option>
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="USUARIO">Usuario</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Comisión (%)</label>
                <input 
                  type="number"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="20"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                <AlertCircle size={14} />
                <p className="text-[10px] font-bold uppercase tracking-tighter">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 bg-white/5 active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white bg-brand-primary shadow-lg shadow-brand-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {isSaving ? 'Guardando...' : (user ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};
