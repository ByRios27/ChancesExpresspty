import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc, setDoc, getDocs, limit, Query, DocumentData, orderBy } from 'firebase/firestore';
import { useStore, User, Draw, Ticket } from '../store/useStore';
import { LogIn, Mail, Lock, AlertCircle, Ticket as TicketIcon } from 'lucide-react';
import { generateSellerId } from '../utils/helpers';

function deferLowPriorityWork(task: () => void): () => void {
  if (typeof window !== 'undefined' && typeof (window as any).requestIdleCallback === 'function') {
    const id = (window as any).requestIdleCallback(() => task(), { timeout: 300 });
    return () => {
      if (typeof (window as any).cancelIdleCallback === 'function') {
        (window as any).cancelIdleCallback(id);
      }
    };
  }

  const timeoutId = globalThis.setTimeout(task, 0);
  return () => globalThis.clearTimeout(timeoutId);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setCurrentUser, updateSettings } = useStore();
  const currentStoreUser = useStore((state) => state.currentUser);

  useEffect(() => {
    let logoutGraceTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (logoutGraceTimer) {
          clearTimeout(logoutGraceTimer);
          logoutGraceTimer = null;
        }
        setLoading(true);
        setAuthError(null);
        
        if (firebaseUser.isAnonymous) {
          setLoading(false);
          return;
        }

        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          let userData: User | null = null;
          
          if (userSnap.exists()) {
            userData = userSnap.data() as User;
          } else if (firebaseUser.email) {
            const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email), limit(1));
            const querySnap = await getDocs(q);
            
            if (!querySnap.empty) {
              const docSnap = querySnap.docs[0];
              const existingData = docSnap.data() as User;
              userData = { ...existingData, id: firebaseUser.uid };
              await setDoc(userRef, userData);
            }
          }
          
          if (userData) {
            if (userData.status === 'inactive') {
              setAuthError('Tu cuenta está inactiva. Contacta al administrador.');
              await signOut(auth);
              setLoading(false);
              return;
            }

            // Migration: Ensure user has a sellerId
            if (!userData.sellerId || userData.sellerId.length < 4) {
              const newSellerId = generateSellerId();
              userData.sellerId = newSellerId;
              await setDoc(userRef, { sellerId: newSellerId }, { merge: true });
            }

            // Special handling for CEO
            if (firebaseUser.email === 'jrios5061@gmail.com' && userData.role !== 'CEO') {
              userData.role = 'CEO';
              userData.email = 'jrios5061@gmail.com';
              await setDoc(userRef, { role: 'CEO', email: 'jrios5061@gmail.com' }, { merge: true });
            }
          } else if (firebaseUser.email === 'jrios5061@gmail.com') {
            const sellerId = generateSellerId();

            userData = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Administrador',
              username: 'admin',
              email: 'jrios5061@gmail.com',
              role: 'CEO',
              status: 'active',
              commission: 0.25,
              sellerId: sellerId,
              pin: '1234'
            };
            await setDoc(userRef, userData);
          } else {
            setAuthError('Acceso denegado. No estás registrado en el sistema.');
            await signOut(auth);
            setLoading(false);
            return;
          }
          
          setCurrentUser(userData);
        } catch (error) {
          console.error('Error loading user data:', error);
          setAuthError('Error al cargar datos de usuario.');
        }
        setLoading(false);
      } else {
        // Some environments can briefly report null on resume before restoring session.
        // Give a short grace window before forcing logout.
        if (logoutGraceTimer) clearTimeout(logoutGraceTimer);
        logoutGraceTimer = setTimeout(() => {
          if (!auth.currentUser) {
            setCurrentUser(null);
          }
          setLoading(false);
        }, 1500);
      }
    });

    return () => {
      unsubscribe();
      if (logoutGraceTimer) clearTimeout(logoutGraceTimer);
    };
  }, [setCurrentUser]);

  useEffect(() => {
    if (!currentStoreUser) return;

    const unsubs: (() => void)[] = [];
    let cancelPendingRecalc: (() => void) | null = null;
    const queuePrizeRecalc = (ticketIds?: string[]) => {
      if (cancelPendingRecalc) cancelPendingRecalc();
      cancelPendingRecalc = deferLowPriorityWork(() => {
        cancelPendingRecalc = null;
        useStore.getState().recalculatePrizes(ticketIds);
      });
    };

    const state = useStore.getState();
    if (state.ticketsOwnerId && state.ticketsOwnerId !== currentStoreUser.id) {
      // Prevent showing another user's cached data while the new subscription initializes.
      useStore.setState({
        tickets: [],
        users: currentStoreUser.role === 'CEO' ? state.users : [],
      });
    }

    unsubs.push(onSnapshot(collection(db, 'draws'), { includeMetadataChanges: true }, (snapshot) => {
      const rawResultsSnapshot = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          results: data?.results || null,
          updatedAt: data?.updatedAt || null,
        };
      });
      const draws = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Draw));
      const previousDraws = useStore.getState().draws;

      const previousById = new Map(previousDraws.map((draw) => [draw.id, draw]));
      const nextById = new Map(draws.map((draw) => [draw.id, draw]));
      const sameIdSet =
        previousById.size === nextById.size &&
        Array.from(previousById.keys()).every((id) => nextById.has(id));
      const resultsChanged =
        !sameIdSet ||
        Array.from(nextById.entries()).some(([id, nextDraw]) => {
          const previous = previousById.get(id);
          return (previous?.results?.join(',') || '') !== (nextDraw?.results?.join(',') || '');
        });
      const drawsChanged =
        !sameIdSet ||
        Array.from(nextById.entries()).some(([id, nextDraw]) => {
          const previous = previousById.get(id);
          return (
            previous?.updatedAt !== nextDraw?.updatedAt ||
            previous?.drawTimeSort !== nextDraw?.drawTimeSort ||
            previous?.closeTimeSort !== nextDraw?.closeTimeSort ||
            previous?.isActive !== nextDraw?.isActive
          );
        });

      // Always replace draws from snapshot to avoid stale/partial merges.
      useStore.setState({ draws });
      if (resultsChanged) {
        queuePrizeRecalc();
      }

      console.info('[LottoPro] draws_snapshot_received', {
        buildId: __APP_BUILD_ID__,
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
        rawResultsSnapshot,
        transformedDraws: draws.map((d) => ({
          id: d.id,
          results: d.results || null,
          updatedAt: d.updatedAt || null,
        })),
        effectiveUpdatedAt: Date.now(),
      });
    }, (err) => console.error('Draws subscription error:', err)));

    let q: Query<DocumentData>;
    if (currentStoreUser.role === 'CEO') {
      q = query(
        collection(db, 'tickets'),
        orderBy('timestamp', 'desc')
      );
    } else {
      q = query(
        collection(db, 'tickets'),
        where('userId', '==', currentStoreUser.id),
        orderBy('timestamp', 'desc')
      );
    }

    useStore.setState({ isTicketsRefreshing: true });

    unsubs.push(onSnapshot(q, (snapshot) => {
      const previousTickets = useStore.getState().tickets;
      const changes = snapshot.docChanges();
      const isInitialLoad = previousTickets.length === 0 || changes.length === snapshot.size;

      let nextTickets: Ticket[];
      const changedTicketIds: string[] = [];

      if (isInitialLoad) {
        nextTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
        changedTicketIds.push(...nextTickets.map((ticket) => ticket.id));
      } else {
        const ticketsById = new Map(previousTickets.map((ticket) => [ticket.id, ticket]));

        changes.forEach((change) => {
          const ticketId = change.doc.id;
          if (change.type === 'removed') {
            ticketsById.delete(ticketId);
            return;
          }

          const nextTicket = { id: ticketId, ...change.doc.data() } as Ticket;
          const prevTicket = ticketsById.get(ticketId);
          const sameVersion =
            prevTicket &&
            prevTicket.timestamp === nextTicket.timestamp &&
            prevTicket.total === nextTicket.total &&
            prevTicket.totalPrize === nextTicket.totalPrize &&
            prevTicket.isPaid === nextTicket.isPaid;

          if (!sameVersion) {
            changedTicketIds.push(ticketId);
          }
          ticketsById.set(ticketId, nextTicket);
        });

        nextTickets = Array.from(ticketsById.values());
      }

      nextTickets.sort((a, b) => b.timestamp - a.timestamp);

      useStore.setState((state) => {
        const sameLength = state.tickets.length === nextTickets.length;
        const sameOrder =
          sameLength &&
          state.tickets.every((ticket, index) => ticket.id === nextTickets[index]?.id);

        if (sameOrder && changedTicketIds.length === 0 && state.isTicketsRefreshing === false) {
          return state;
        }

        return {
          ...state,
          tickets: nextTickets,
          isTicketsRefreshing: false,
          lastTicketsSyncAt: Date.now(),
          ticketsOwnerId: currentStoreUser.id,
        };
      });

      if (changedTicketIds.length > 0 || isInitialLoad) {
        const hasResolvedDraws = useStore.getState().draws.some(
          (draw) => !!draw.results && draw.results.length === 3
        );
        if (!hasResolvedDraws) return;

        if (isInitialLoad || changedTicketIds.length > 150) {
          queuePrizeRecalc(isInitialLoad ? undefined : changedTicketIds);
        } else {
          useStore.getState().recalculatePrizes(changedTicketIds);
        }
      }
    }, (err) => {
      console.error('Tickets subscription error:', err);
      useStore.setState({ isTicketsRefreshing: false });
    }));

    if (currentStoreUser.role === 'CEO') {
      unsubs.push(onSnapshot(collection(db, 'users'), (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const previousUsers = useStore.getState().users;
        const sameLength = previousUsers.length === users.length;
        const sameSignature =
          sameLength &&
          previousUsers.every((user, index) => {
            const next = users[index];
            return (
              user.id === next?.id &&
              user.status === next?.status &&
              user.role === next?.role &&
              user.commission === next?.commission &&
              user.capitalInjection === next?.capitalInjection
            );
          });

        if (!sameSignature) {
          useStore.setState({ users });
        }
      }, (err) => console.error('Users subscription error:', err)));
    }

    unsubs.push(onSnapshot(doc(db, 'gameSettings', 'pale'), (snapshot) => {
      if (snapshot.exists()) updateSettings({ pale: snapshot.data() as any });
    }, (err) => console.error('Pale settings error:', err)));

    unsubs.push(onSnapshot(doc(db, 'gameSettings', 'billete'), (snapshot) => {
      if (snapshot.exists()) updateSettings({ billete: snapshot.data() as any });
    }, (err) => console.error('Billete settings error:', err)));

    unsubs.push(onSnapshot(doc(db, 'gameSettings', 'general'), (snapshot) => {
      if (snapshot.exists()) updateSettings(snapshot.data() as any);
    }, (err) => console.error('General settings error:', err)));

    return () => {
      unsubs.forEach(unsub => unsub());
      if (cancelPendingRecalc) cancelPendingRecalc();
    };
  }, [currentStoreUser?.id, currentStoreUser?.role, updateSettings]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        setAuthError('El inicio de sesión con correo/contraseña no está habilitado en Firebase Console.');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setAuthError('Credenciales inválidas.');
      } else {
        setAuthError('Error al iniciar sesión. Intenta con Google.');
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Google login error:', error);
      setAuthError('Error al iniciar sesión con Google.');
      setLoading(false);
    }
  };

  if (loading && !auth.currentUser && !currentStoreUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0B1220] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (!currentStoreUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B1220] text-white p-6">
        <div className="w-full max-w-md bg-[#121A2B] rounded-[2.5rem] border border-white/10 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TicketIcon className="text-brand-primary" size={32} />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight">LottoPro</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sistema de Gestión de Sorteos</p>
          </div>

          {authError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
              <AlertCircle size={20} />
              <p className="text-xs font-bold uppercase tracking-tight">{authError}</p>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white outline-none focus:border-brand-primary/50 transition-colors"
                  required
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-brand-primary text-black h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 active:scale-95 transition-all mt-4"
            >
              Iniciar Sesión
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-[8px] font-black uppercase tracking-widest">
              <span className="bg-[#121A2B] px-4 text-slate-500">O continuar con</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white/5 border border-white/10 text-white h-14 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>

          <p className="text-center text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-8">
            Solo personal autorizado
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
