import React, { useState, useRef } from 'react';
import { X, FileSpreadsheet, Upload, Database, Check, Info } from 'lucide-react';
import type { DataSourceType, AppSettings } from '../types';
import { parseBTCData } from '../utils/sheetParser';

interface DataSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings, customCSVData?: string) => void;
}

export const DataSettingsModal: React.FC<DataSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [source, setSource] = useState<DataSourceType>(settings.dataSource);
  const [sheetUrl, setSheetUrl] = useState(settings.sheetUrl);
  const [uploadedFile, setUploadedFile] = useState<string | null>(settings.uploadedFileName);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        // Test parsing the file to make sure it's valid
        const parsed = parseBTCData(text);
        if (parsed.length === 0) {
          setError('No valid Bitcoin transactions found in CSV. Ensure Column B, T, U are present.');
          return;
        }
        setUploadedFile(file.name);
        setCsvContent(text);
      } catch (err) {
        setError('Failed to parse CSV file structure.');
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are supported.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseBTCData(text);
        if (parsed.length === 0) {
          setError('No valid Bitcoin transactions found. Check Columns B (Date), T (Amount), U (Spent THB).');
          return;
        }
        setUploadedFile(file.name);
        setCsvContent(text);
      } catch (err) {
        setError('Error parsing CSV file.');
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
    
    if (source === 'file-upload' && !uploadedFile) {
      setError('Please select or upload a CSV file.');
      return;
    }

    onSaveSettings(
      {
        dataSource: source,
        sheetUrl,
        targetBTC: settings.targetBTC,
        uploadedFileName: uploadedFile,
        monthlyBudgetTHB: settings.monthlyBudgetTHB,
        annualIncreasePercent: settings.annualIncreasePercent,
        btcAnnualGrowthPercent: settings.btcAnnualGrowthPercent,
      },
      csvContent || undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-white">Data Connection Settings</h3>
            <p className="text-xs text-slate-400">Configure how the dashboard reads your transactions</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs font-semibold text-rose-400">
              {error}
            </div>
          )}

          {/* Select Source */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Data Source Mode
            </span>
            <div className="grid grid-cols-3 gap-3">
              {/* Google Sheet Button */}
              <button
                type="button"
                onClick={() => {
                  setSource('google-sheet');
                  setError(null);
                }}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                  source === 'google-sheet'
                    ? 'border-emerald-500 bg-emerald-500/5 text-white'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className={`h-6 w-6 ${source === 'google-sheet' ? 'text-emerald-400' : ''}`} />
                <span className="text-xs font-semibold">Google Sheet</span>
              </button>

              {/* CSV Upload Button */}
              <button
                type="button"
                onClick={() => {
                  setSource('file-upload');
                  setError(null);
                }}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                  source === 'file-upload'
                    ? 'border-blue-500 bg-blue-500/5 text-white'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Upload className={`h-6 w-6 ${source === 'file-upload' ? 'text-blue-400' : ''}`} />
                <span className="text-xs font-semibold">Local CSV</span>
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
                    ? 'border-amber-500 bg-amber-500/5 text-white'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Database className={`h-6 w-6 ${source === 'mock-data' ? 'text-amber-400' : ''}`} />
                <span className="text-xs font-semibold">Demo Data</span>
              </button>
            </div>
          </div>

          {/* Conditional Input Areas */}
          {source === 'google-sheet' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <label htmlFor="sheet-url-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Spreadsheet URL
                </label>
                <input
                  id="sheet-url-input"
                  type="text"
                  value={sheetUrl}
                  onChange={e => setSheetUrl(e.target.value)}
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
                />
              </div>

              {/* Instructions Callout */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <Info className="h-4 w-4 text-emerald-400" />
                  How to make Google Sheets readable:
                </div>
                <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                  <li>In your Google Sheet, click <strong className="text-white">File &gt; Share &gt; Publish to the web</strong>.</li>
                  <li>Select sheet tab <strong className="text-white">BTC</strong> and format as <strong className="text-white">Comma-separated values (.csv)</strong>.</li>
                  <li>Click <strong className="text-white">Publish</strong>, copy that link, and paste it here.</li>
                  <li>Alternatively, ensure the sheet is shared as <strong className="text-white">"Anyone with the link can view"</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          {source === 'file-upload' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Drag & Drop CSV File
              </span>
              
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-blue-500 rounded-xl bg-slate-950/40 py-8 px-4 text-center cursor-pointer transition-all hover:bg-slate-950/70"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
                
                {uploadedFile ? (
                  <div className="space-y-2">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                      <Check className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{uploadedFile}</p>
                      <p className="text-xs text-slate-400">Click or drag another file to replace</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-300">Select file or drop here</p>
                      <p className="text-xs text-slate-500">Supports standard CSV sheets exports (.csv)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Column expectations tips */}
              <div className="rounded-xl bg-slate-950/20 p-3.5 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-bold text-slate-350 block">Required CSV Columns mapping:</span>
                <p>Column A (1st column): DATE (YYYY-MM-DD)</p>
                <p>Column B (2nd column): BTC amount</p>
                <p>Column C (3rd column): Fiat amount cost (THB)</p>
                <p>Column D (4th column): BTCTHB (Price at purchase)</p>
              </div>
            </div>
          )}

          {source === 'mock-data' && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-400 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
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
        <div className="flex justify-end gap-3 border-t border-slate-800 bg-slate-950/40 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 hover:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold text-black transition-all ${
              source === 'google-sheet'
                ? 'bg-emerald-400 hover:bg-emerald-300'
                : source === 'file-upload'
                ? 'bg-blue-400 hover:bg-blue-300'
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
