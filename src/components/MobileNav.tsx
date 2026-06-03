import React from 'react';
import { LayoutDashboard, Target, Home } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface MobileNavProps {
  activeTab: 'dashboard' | 'forecast' | 'retirement';
  setActiveTab: (tab: 'dashboard' | 'forecast' | 'retirement') => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
      {/* Glassmorphic Background */}
      <div className="absolute inset-0 bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800" />
      
      <div className="relative flex justify-around items-center h-16 pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${
            activeTab === 'dashboard' 
              ? 'text-amber-500 scale-105' 
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <LayoutDashboard className={`h-5 w-5 ${activeTab === 'dashboard' ? 'fill-amber-500/20 stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold">{t('app.tab.dashboard')}</span>
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${
            activeTab === 'forecast' 
              ? 'text-amber-500 scale-105' 
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <Target className={`h-5 w-5 ${activeTab === 'forecast' ? 'fill-amber-500/20 stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold">{t('app.tab.forecast')}</span>
        </button>

        <button
          onClick={() => setActiveTab('retirement')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${
            activeTab === 'retirement' 
              ? 'text-amber-500 scale-105' 
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <Home className={`h-5 w-5 ${activeTab === 'retirement' ? 'fill-amber-500/20 stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold">{t('app.tab.retirement')}</span>
        </button>
      </div>
    </div>
  );
};
