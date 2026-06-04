import React, { useState, useRef } from 'react';
import { X, FileSpreadsheet, Upload, Database, Check, Info, HardDrive, Download } from 'lucide-react';
import type { DataSourceType, AppSettings, Transaction, Transfer } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { parseBTCData, generateCSV } from '../utils/sheetParser';

interface DataSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  transactions?: Transaction[];
  transfers?: Transfer[];
}

export const DataSettingsModal: React.FC<DataSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  transactions = [],
  transfers = [],
}) => {
  const { t } = useLanguage();
  const [source, setSource] = useState<DataSourceType>(settings.dataSource);
  const [sheetUrl, setSheetUrl] = useState(settings.sheetUrl);
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl || '');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseBTCData(text);
        if (parsed.transactions.length === 0 && parsed.transfers.length === 0) {
          setError('No valid Bitcoin transactions found in CSV. Ensure Column B, T, U are present.');
          return;
        }
        
        // Overwrite local storage directly
        localStorage.setItem('btc_tracker_local_transactions', JSON.stringify(parsed.transactions));
        localStorage.setItem('btc_tracker_transfers', JSON.stringify(parsed.transfers));
        
        setSuccessMsg(`Successfully imported ${parsed.transactions.length} transactions and ${parsed.transfers.length} transfers!`);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (err) {
        setError('Failed to parse CSV file structure.');
      }
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    if (source === 'google-sheet') {
      if (!sheetUrl.startsWith('https://docs.google.com/spreadsheets/d/')) {
        setError('Invalid Google Sheet URL format.');
        return;
      }
    }
    
    onSaveSettings(
      {
        dataSource: source,
        sheetUrl,
        webhookUrl: webhookUrl.trim() || undefined,
        targetBTC: settings.targetBTC,
        monthlyBudgetTHB: settings.monthlyBudgetTHB,
        annualIncreasePercent: settings.annualIncreasePercent,
        btcAnnualGrowthPercent: settings.btcAnnualGrowthPercent,
        vaultLocations: settings.vaultLocations,
      }
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative flex flex-col w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl max-h-[90dvh] overflow-hidden z-10 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('settings.title')}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400">{t('settings.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto min-h-0">
          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs font-semibold text-rose-400">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs font-semibold text-emerald-500 flex items-center gap-2">
              <Check className="h-4 w-4" />
              {successMsg}
            </div>
          )}

          {/* Select Source */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              Data Source Mode
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Google Sheet Button */}
              <button
                type="button"
                onClick={() => {
                  setSource('google-sheet');
                  setError(null);
                }}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                  source === 'google-sheet'
                    ? 'border-emerald-500 bg-emerald-500/5 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-400 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-700 dark:text-slate-200'
                }`}
              >
                <FileSpreadsheet className={`h-6 w-6 ${source === 'google-sheet' ? 'text-emerald-400' : ''}`} />
                <span className="text-xs font-semibold">Google Sheet</span>
              </button>



              {/* Local Storage Button */}
              <button
                type="button"
                onClick={() => {
                  setSource('local-storage');
                  setError(null);
                }}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                  source === 'local-storage'
                    ? 'border-indigo-500 bg-indigo-500/5 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-400 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-700 dark:text-slate-200'
                }`}
              >
                <HardDrive className={`h-6 w-6 ${source === 'local-storage' ? 'text-indigo-400' : ''}`} />
                <span className="text-xs font-semibold">Local Storage</span>
              </button>

              {/* Mock Data Button */}
              <button
                type="button"
                onClick={() => {
                  setSource('mock-data');
                  setError(null);
                }}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                  source === 'mock-data'
                    ? 'border-amber-500 bg-amber-500/5 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-400 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-700 dark:text-slate-200'
                }`}
              >
                <Database className={`h-6 w-6 ${source === 'mock-data' ? 'text-amber-400' : ''}`} />
                <span className="text-xs font-semibold">Demo Data</span>
              </button>
            </div>
          </div>

          {/* Conditional Input Areas */}
          {source === 'local-storage' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 pt-2">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/40 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-500/20 p-2 rounded-full">
                    <HardDrive className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Local Offline Storage</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Data is saved directly in this browser securely.</p>
                  </div>
                </div>
                
                <div className="pt-2 grid grid-cols-2 gap-3">
                  <input 
                    type="file" 
                    accept=".csv" 
                    ref={fileInputRef}
                    onChange={handleImportCSV}
                    className="hidden" 
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 justify-center w-full py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-semibold"
                  >
                    <Upload className="h-4 w-4" />
                    Import CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const csvStr = generateCSV(transactions, transfers);
                      const blob = new Blob([csvStr], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `satoshi-stack-backup-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-2 justify-center w-full py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-semibold"
                  >
                    <Download className="h-4 w-4" />
                    Export Backup
                  </button>
                </div>
              </div>
            </div>
          )}

          {source === 'google-sheet' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                    {t('settings.google.url')}
                  </label>
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
                    className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                    {t('settings.google.webhook')}
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500">{t('settings.google.webhook_desc')}</p>
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/40 p-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                  <Info className="h-4 w-4 text-emerald-400" />
                  How to make Google Sheets readable:
                </div>
                <ol className="list-decimal pl-4 space-y-1 text-slate-400 dark:text-slate-400">
                  <li>In your Google Sheet, click <strong className="text-slate-900 dark:text-white">File &gt; Share &gt; Publish to the web</strong>.</li>
                  <li>Select sheet tab <strong className="text-slate-900 dark:text-white">BTC</strong> and format as <strong className="text-slate-900 dark:text-white">Comma-separated values (.csv)</strong>.</li>
                  <li>Click <strong className="text-slate-900 dark:text-white">Publish</strong>, copy that link, and paste it here.</li>
                  <li>Alternatively, ensure the sheet is shared as <strong className="text-slate-900 dark:text-white">"Anyone with the link can view"</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          {source === 'mock-data' && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/40 p-4 text-xs text-slate-400 dark:text-slate-400 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                <Database className="h-4 w-4 text-amber-500" />
                Demo Data Mode Active
              </div>
              <p>
                This mode parses a hardcoded set of 29 transactions spanning January 2024 to May 2026. 
                It is ideal for testing the features, visual graphs, and forecasting logic without connecting to live sheets.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/40 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold text-black transition-all ${
              source === 'google-sheet'
                ? 'bg-emerald-400 hover:bg-emerald-300'
                : source === 'local-storage'
                ? 'bg-indigo-400 hover:bg-indigo-300'
                : 'bg-amber-400 hover:bg-amber-300'
            }`}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};
