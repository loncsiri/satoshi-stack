import React from 'react';
import { Bitcoin, Settings, RefreshCw, Layers, Database, FileSpreadsheet, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import type { DataSourceType } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  dataSource: DataSourceType;
  uploadedFileName: string | null;
  priceLoading: boolean;
  priceSource: string | null;
  priceError: string | null;
  onRefreshPrice: () => void;
  onOpenSettings: () => void;
  onOpenVaultManager: () => void;
  isPrivacyMode: boolean;
  onTogglePrivacyMode: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  currency: 'THB' | 'USD';
  onToggleCurrency: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dataSource,
  uploadedFileName,
  priceLoading,
  priceSource,
  priceError,
  onRefreshPrice,
  onOpenSettings,
  onOpenVaultManager,
  isPrivacyMode,
  onTogglePrivacyMode,
  theme,
  onToggleTheme,
  currency,
  onToggleCurrency,
}) => {
  const { currentPrice } = useCurrency();
  const { language, setLanguage, t } = useLanguage();
  
  const getStatusBadge = () => {
    switch (dataSource) {
      case 'google-sheet':
        return (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>{t('header.sync_status.google')}</span>
          </div>
        );
      case 'file-upload':
        return (
          <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400">
            <Layers className="h-3.5 w-3.5" />
            <span>{uploadedFileName || t('header.sync_status.local')}</span>
          </div>
        );
      case 'mock-data':
      default:
        return (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
            <Database className="h-3.5 w-3.5" />
            <span>{t('header.sync_status.demo')}</span>
          </div>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <Bitcoin className="h-5.5 w-5.5 fill-current" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
                {t('header.title')}
              </h1>
              <p className="hidden text-[10px] font-medium text-slate-400 sm:block">
                BTC Accumulation & Goals
              </p>
            </div>
          </div>

          {/* Center: Indicators and Live Price */}
          <div className="flex flex-1 items-center justify-end gap-3 sm:justify-center">
            {/* Connection Status Badge */}
            <div className="hidden md:block">
              {getStatusBadge()}
            </div>

            {/* Live Price Ticker */}
            <div className="flex items-center gap-2 rounded-xl bg-slate-900/60 border border-slate-800 px-3.5 py-1.5">
              <div className="flex flex-col text-right">
                <span className="hidden sm:block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t('header.live_price')}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {currency === 'THB' ? '฿' : '$'}{currentPrice.toLocaleString()} {currency}
                </span>
              </div>
              <button
                onClick={onRefreshPrice}
                disabled={priceLoading}
                className={`flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors duration-150 ${priceLoading ? 'cursor-not-allowed opacity-50' : ''}`}
                title={priceSource ? `Source: ${priceSource}` : 'Refresh Price'}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${priceLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Small status badge on mobile */}
            <div className="block md:hidden">
              <button 
                onClick={onOpenSettings}
                className="flex items-center justify-center h-9 w-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              >
                {dataSource === 'google-sheet' && <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-400" />}
                {dataSource === 'file-upload' && <Layers className="h-4.5 w-4.5 text-blue-400" />}
                {dataSource === 'mock-data' && <Database className="h-4.5 w-4.5 text-amber-400" />}
              </button>
            </div>

            {/* Controls Container */}
            <div className="flex flex-row items-center gap-1.5 sm:gap-3 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
              {/* Currency Toggle */}
              <button
                onClick={onToggleCurrency}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors justify-center font-bold shrink-0"
                title="Toggle Currency"
              >
                <span className="text-xs font-bold w-4 text-center">{currency === 'THB' ? '฿' : '$'}</span>
              </button>

              {/* Language Toggle */}
              <button
                onClick={() => setLanguage(language === 'en' ? 'th' : 'en')}
                className="flex items-center justify-center h-8 sm:h-10 px-2 sm:px-3 rounded-xl bg-white/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                title="Toggle Language"
              >
                <span className="text-xs font-bold w-6 text-center uppercase">{language}</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={onToggleTheme}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto justify-center"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {/* Privacy Toggle */}
              <button
                onClick={onTogglePrivacyMode}
                className={`flex items-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-colors w-full sm:w-auto justify-center ${
                  isPrivacyMode
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Toggle Privacy Mode"
              >
                {isPrivacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>

              {/* Vault Manager Button */}
              <button
                onClick={onOpenVaultManager}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto justify-center shadow-sm"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Vaults</span>
              </button>

              {/* Settings Button */}
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white p-2 sm:px-3 sm:py-2 text-xs font-bold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-sm shrink-0"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Connection Status Alert Banner if in Demo Mode */}
      {dataSource === 'mock-data' && (
        <div className="bg-amber-500/10 border-y border-amber-500/20 text-center py-1.5 text-xs text-amber-400 font-semibold px-4">
          ⚠️ Running on mock demo data. Open Settings to connect your Google Sheet or upload a CSV file.
        </div>
      )}
      {priceError && (
        <div className="bg-rose-500/15 border-y border-rose-500/20 text-center py-1.5 text-xs text-rose-400 font-medium px-4">
          ⚠️ Price Fetch Alert: {priceError}
        </div>
      )}
    </header>
  );
};
