import React, { useState } from 'react';
import { PaleSettingsSection } from './PaleSettingsSection';
import { BilleteSettingsSection } from './BilleteSettingsSection';
import { cn } from '../../utils/helpers';
import { Zap, Ticket } from 'lucide-react';

export const SpecialPlaysSettingsSection: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'pale' | 'billete'>('pale');

  return (
    <div className="space-y-6">
      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/5 mx-2">
        <button 
          onClick={() => setActiveSubTab('pale')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeSubTab === 'pale' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <Zap size={14} />
          Palé
        </button>
        <button 
          onClick={() => setActiveSubTab('billete')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeSubTab === 'billete' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <Ticket size={14} />
          Billete
        </button>
      </div>

      <div className="px-2">
        {activeSubTab === 'pale' ? <PaleSettingsSection /> : <BilleteSettingsSection />}
      </div>
    </div>
  );
};
