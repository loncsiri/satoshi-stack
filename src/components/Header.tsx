import React from 'react';
import { Bitcoin, Settings, RefreshCw, Layers, Database, FileSpreadsheet, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import type { DataSourceType } from '../types';

interface HeaderProps {
  dataSource: DataSourceType;
  uploadedFileName: string | null;
  livePrice: number;
  priceLoading: boolean;
  priceSource: string | null;
  priceError: string | null;
  onRefreshPrice: () => void;
  onOpenSettings: () => void;
  isPrivacyMode: boolean;
  onTogglePrivacyMode: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dataSource,
  uploadedFileName,
  livePrice,
  priceLoading,
  priceSource,
  priceError,
  onRefreshPrice,
  onOpenSettings,
  isPrivacyMode,
  onTogglePrivacyMode,
  theme,
  onToggleTheme,
}) => {
  const getStatusBadge = () => {
    switch (dataSource) {
      case 'google-sheet':
        return (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Google Sheet Live</span>
          </div>
        );
      case 'file-upload':
        return (
          <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400">
            <Layers className="h-3.5 w-3.5" />
            <span>Local CSV: {uploadedFileName || 'BTC.csv'}</span>
          </div>
        );
      case 'mock-data':
      default:
        return (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
            <Database className="h-3.5 w-3.5" />
            <span>Demo Mode (Mock Data)</span>
          </div>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <Bitcoin className="h-5.5 w-5.5 fill-current" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                Satoshi Stack
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
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Live BTC Price
                </span>
                <span className="text-sm font-bold text-white">
                  ฿{livePrice.toLocaleString()} THB
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

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="flex items-center justify-center h-9 w-9 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all duration-150"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* Privacy Toggle Button */}
            <button
              onClick={onTogglePrivacyMode}
              className="flex items-center justify-center h-9 w-9 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all duration-150"
              title={isPrivacyMode ? 'Show Balances' : 'Hide Balances'}
            >
              {isPrivacyMode ? <Eye className="h-4.5 w-4.5 text-amber-500 animate-pulse" /> : <EyeOff className="h-4.5 w-4.5" />}
            </button>

            <button
              onClick={onOpenSettings}
              className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-2 text-sm font-medium transition-all duration-150"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
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
