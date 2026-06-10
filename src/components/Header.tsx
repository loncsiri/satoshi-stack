import React, { useState } from 'react';
import { Bitcoin, Settings, RefreshCw, Database, FileSpreadsheet, HardDrive, Eye, EyeOff, Sun, Moon, Menu, X } from 'lucide-react';
import type { DataSourceType } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  dataSource: DataSourceType;
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      case 'local-storage':
        return (
          <div className="flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <HardDrive className="h-3.5 w-3.5" />
            <span>{t('header.sync_status.local')}</span>
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
    <>
      <header className="sticky top-0 z-[100] w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Brand Logo */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                <Bitcoin className="h-5.5 w-5.5 fill-current" />
              </div>
              <div className="flex flex-col">
                <h1 className="hidden sm:block text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-amber-500 to-amber-300 dark:from-amber-400 dark:to-amber-200 bg-clip-text text-transparent">
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
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5">
                <div className="flex flex-col text-right">
                  <span className="hidden sm:block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('header.live_price')}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {currency === 'THB' ? '฿' : '$'}{currentPrice.toLocaleString()} {currency}
                  </span>
                </div>
                <button
                  onClick={onRefreshPrice}
                  disabled={priceLoading}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors duration-150 ${priceLoading ? 'cursor-not-allowed opacity-50' : ''}`}
                  title={priceSource ? `Source: ${priceSource}` : 'Refresh Price'}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${priceLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink max-w-[50%] md:max-w-none justify-end min-w-0">
              {/* Hamburger Menu Toggle (Mobile Only) */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                title="Open Menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Controls Container (Desktop Only) */}
              <div className="hidden md:flex flex-row items-center gap-3 w-full">
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
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors justify-center shrink-0"
                  title="Toggle Language"
                >
                  <span className="text-xs font-bold w-6 text-center uppercase">{language}</span>
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={onToggleTheme}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors justify-center"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </button>

                {/* Privacy Toggle */}
                <button
                  onClick={onTogglePrivacyMode}
                  className={`flex items-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-colors justify-center ${
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
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors justify-center shadow-sm"
                >
                  <Settings className="h-4 w-4" />
                  <span>Vaults</span>
                </button>

                {/* Settings Button */}
                <button
                  onClick={onOpenSettings}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors justify-center shadow-sm shrink-0"
                >
                  <Settings className="h-4 w-4" />
                  <span>Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile Side Drawer Overlay */}
      <div 
        className={`fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div 
          className={`absolute top-0 right-0 bottom-0 w-3/4 max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-6 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] dark:shadow-[-10px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out transform overflow-y-auto ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Menu</h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col gap-3 shrink-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Display</h3>
            <button
              onClick={onToggleCurrency}
              className="flex items-center justify-between w-full rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 text-sm font-semibold text-slate-700 dark:text-slate-200 active:bg-slate-200 dark:active:bg-slate-800 transition-colors"
            >
              <span className="flex items-center gap-3">
                <span className="font-bold text-lg w-6 text-center">{currency === 'THB' ? '฿' : '$'}</span>
                Currency
              </span>
              <span className="text-slate-500 dark:text-slate-400 uppercase font-bold">{currency}</span>
            </button>

            <button
              onClick={() => setLanguage(language === 'en' ? 'th' : 'en')}
              className="flex items-center justify-between w-full rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 text-sm font-semibold text-slate-700 dark:text-slate-200 active:bg-slate-200 dark:active:bg-slate-800 transition-colors"
            >
              <span className="flex items-center gap-3">
                <span className="font-bold text-sm w-6 text-center uppercase">{language}</span>
                Language
              </span>
              <span className="text-slate-500 dark:text-slate-400 uppercase font-bold">{language}</span>
            </button>

            <button
              onClick={onToggleTheme}
              className="flex items-center justify-between w-full rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 text-sm font-semibold text-slate-700 dark:text-slate-200 active:bg-slate-200 dark:active:bg-slate-800 transition-colors"
            >
              <span className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                Theme
              </span>
              <span className="text-slate-500 dark:text-slate-400 capitalize font-bold">{theme}</span>
            </button>
          </div>

          <div className="flex flex-col gap-3 shrink-0 pb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Controls</h3>
            <button
              onClick={onTogglePrivacyMode}
              className={`flex items-center justify-between w-full rounded-xl border p-4 text-sm font-semibold active:opacity-80 transition-colors ${
                isPrivacyMode
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-3">
                {isPrivacyMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                Privacy Mode
              </span>
              <span className="text-xs font-bold">{isPrivacyMode ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => {
                onOpenVaultManager();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center justify-between w-full rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 text-sm font-semibold text-slate-700 dark:text-slate-200 active:bg-slate-200 dark:active:bg-slate-800 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-amber-500" />
                Vaults Manager
              </span>
            </button>

            <button
              onClick={() => {
                onOpenSettings();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center justify-between w-full rounded-xl bg-amber-500 text-black p-4 text-sm font-bold shadow-lg shadow-amber-500/20 active:opacity-80 transition-opacity mt-4"
            >
              <span className="flex items-center gap-3">
                <Database className="h-5 w-5" />
                Data Settings
              </span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Connection Status Alert Banner if in Demo Mode */}
      {dataSource === 'mock-data' && (
        <div className="bg-amber-500/10 border-y border-amber-500/20 text-center py-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold px-4">
          ⚠️ Running on mock demo data. Open Settings to connect your Google Sheet or upload a CSV file.
        </div>
      )}
      {priceError && (
        <div className="bg-rose-500/15 border-y border-rose-500/20 text-center py-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium px-4">
          ⚠️ Price Fetch Alert: {priceError}
        </div>
      )}
    </>
  );
};
