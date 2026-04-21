import React, { useState } from 'react';
import { SalesPanel } from './components/SalesPanel';
import { StatsDashboard } from './components/StatsDashboard';
import { SettingsPage } from './components/Settings/SettingsPage';
import { HistoryPage } from './components/History/HistoryPage';
import { ResultsPage } from './components/ResultsPage';
import { WinnersPage } from './components/Winners/WinnersPage';
import { ClosuresPage } from './components/ClosuresPage';
import { ArchivePage } from './components/ArchivePage';
import { SettlementPage } from './components/SettlementPage';
import { Sidebar } from './components/Sidebar';
import { GlobalHeader } from './components/GlobalHeader';
import { Ticket, BarChart3, Settings as SettingsIcon, History as HistoryIcon, Trophy, Menu, Lock as LockIcon } from 'lucide-react';
import { cn } from './utils/helpers';
import { useStore, Page } from './store/useStore';
import { TicketModal } from './components/TicketModal';
import { AuthProvider } from './components/AuthProvider';
import { PullToRefresh } from './components/PullToRefresh';
import { ErrorBoundary } from './components/ErrorBoundary';
import TempUserCreate from './components/TempUserCreate';
import TicketSearch from './features/ticket-search/TicketSearch';
import TicketCreate from './features/ticket-create/TicketCreate';

export default function App() {
  const { currentPage, setCurrentPage } = useStore();
  const { tickets } = useStore();
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [experimentalFeature, setExperimentalFeature] = useState<'none' | 'ticket-search' | 'ticket-create'>(() => {
    const feature = new URLSearchParams(window.location.search).get('feature');
    if (feature === 'ticket-search') return 'ticket-search';
    if (feature === 'ticket-create') return 'ticket-create';
    return 'none';
  });
  const showTicketSearch = experimentalFeature === 'ticket-search';
  const showTicketCreate = experimentalFeature === 'ticket-create';

  const handleRefresh = async () => {
    // In a real app, you might re-fetch data. 
    // Here, we can just reload the window to "refresh" the app state.
    window.location.reload();
  };

  return (
    <ErrorBoundary>
      <AuthProvider>
        <TempUserCreate />
        <div className="flex flex-col h-[100dvh] max-w-[400px] mx-auto bg-gradient-to-b from-[#0f172a] via-[#0b1220] to-[#080d19] border border-white/5 shadow-[0_18px_50px_rgba(2,6,23,0.65)] overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Global Header */}
        <GlobalHeader onMenuClick={() => setIsSidebarOpen(true)} />

        <div className="px-3 py-2 border-b border-white/5 bg-[#0D1527] flex items-center justify-between gap-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Flujo Nuevo (Prueba Controlada)
          </p>
          {!showTicketCreate ? (
            <button
              onClick={() => setExperimentalFeature('ticket-create')}
              className="px-2 py-1 rounded bg-emerald-600 text-[10px] font-black uppercase tracking-wider text-white"
            >
              Abrir
            </button>
          ) : (
            <button
              onClick={() => setExperimentalFeature('none')}
              className="px-2 py-1 rounded bg-slate-700 text-[10px] font-black uppercase tracking-wider text-white"
            >
              Volver
            </button>
          )}
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden relative">
          {showTicketCreate && <TicketCreate />}
          {showTicketSearch && <TicketSearch />}

          {!showTicketSearch && !showTicketCreate && (
            <>
          {currentPage === 'sales' && <SalesPanel />}
          {currentPage === 'history' && <HistoryPage />}
          {currentPage === 'stats' && <StatsDashboard />}
          {currentPage === 'results' && <ResultsPage />}
          {currentPage === 'settings' && <SettingsPage />}
          
          {/* Placeholder for new pages */}
          {currentPage === 'winners' && <WinnersPage />}
          {currentPage === 'closures' && <ClosuresPage />}
          {currentPage === 'settlement' && <SettlementPage />}
          {currentPage === 'archive' && <ArchivePage />}
            </>
          )}
        </main>
        
        {/* Bottom Navigation */}
        <nav className="bg-[#0B1220] border-t border-white/5 flex justify-around items-center py-2 h-[60px] safe-area-bottom z-50">
          <button
            onClick={() => setCurrentPage('sales')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              currentPage === 'sales' ? "text-brand-primary scale-105" : "text-slate-500"
            )}
          >
            <Ticket size={20} strokeWidth={currentPage === 'sales' ? 2.5 : 2} />
            <span className="text-[7px] font-black uppercase tracking-widest">Ventas</span>
          </button>

          <button
            onClick={() => setCurrentPage('history')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              currentPage === 'history' ? "text-brand-primary scale-105" : "text-slate-500"
            )}
          >
            <HistoryIcon size={20} strokeWidth={currentPage === 'history' ? 2.5 : 2} />
            <span className="text-[7px] font-black uppercase tracking-widest">Historial</span>
          </button>

          <button
            onClick={() => setCurrentPage('results')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              currentPage === 'results' ? "text-brand-primary scale-105" : "text-slate-500"
            )}
          >
            <Trophy size={20} strokeWidth={currentPage === 'results' ? 2.5 : 2} />
            <span className="text-[7px] font-black uppercase tracking-widest">Resultados</span>
          </button>
          
          <button
            onClick={() => setCurrentPage('stats')}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              currentPage === 'stats' ? "text-brand-primary scale-105" : "text-slate-500"
            )}
          >
            <BarChart3 size={20} strokeWidth={currentPage === 'stats' ? 2.5 : 2} />
            <span className="text-[7px] font-black uppercase tracking-widest">Reportes</span>
          </button>
        </nav>

        {/* Global Ticket Modal could be here, but SalesPanel handles its own for now */}
      </div>
    </AuthProvider>
    </ErrorBoundary>
  );
}
