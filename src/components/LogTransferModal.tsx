import React, { useState, useEffect } from 'react';
import { X, ArrowRight, History, Trash2, ArrowRightLeft, AlertTriangle, Loader2 } from 'lucide-react';
import type { AppSettings, Transfer } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface LogTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  transfers: Transfer[];
  onSaveTransfers: (transfers: Transfer[]) => void;
}

export const LogTransferModal: React.FC<LogTransferModalProps> = ({
  isOpen,
  onClose,
  settings,
  transfers,
  onSaveTransfers,
}) => {
  const { t } = useLanguage();
  const locations = settings.vaultLocations || ['Exchange', 'Trezor'];
  
  // Transfer Form State
  const [fromLocation, setFromLocation] = useState(locations[0] || 'Exchange');
  const [toLocation, setToLocation] = useState(locations.length > 1 ? locations[1] : 'Exchange');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep internal state in sync if locations change while closed
  useEffect(() => {
    if (isOpen) {
      if (!locations.includes(fromLocation)) setFromLocation(locations[0] || 'Exchange');
      if (!locations.includes(toLocation)) setToLocation(locations.length > 1 ? locations[1] : 'Exchange');
    }
  }, [isOpen, locations, fromLocation, toLocation]);

  if (!isOpen) return null;

  const handleLogTransfer = async () => {
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) return;
    if (fromLocation === toLocation) return;

    if (settings.dataSource === 'google-sheet' && !settings.webhookUrl) {
       setError(t('add_tx.setup_required'));
       return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (settings.dataSource === 'google-sheet' && settings.webhookUrl) {
         await fetch(settings.webhookUrl, {
           method: 'POST',
           mode: 'no-cors',
           headers: {
             'Content-Type': 'text/plain',
           },
           body: JSON.stringify({
             date: transferDate,
             btc: amt,
             location: toLocation,
             fromLocation: fromLocation
           }),
         });
      }

      const newTransfer: Transfer = {
        id: `tr-${Date.now()}`,
        date: transferDate,
        amount: amt,
        fromLocation,
        toLocation,
      };

      const updatedTransfers = [...transfers, newTransfer];
      onSaveTransfers(updatedTransfers);
      
      // Reset form
      setTransferAmount('');
    } catch (err) {
      console.error(err);
      setError(t('add_tx.error_submit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransfer = (id: string) => {
    const updated = transfers.filter(t => t.id !== id);
    onSaveTransfers(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative flex flex-col w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl max-h-[90dvh] overflow-hidden z-10 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-400" />
              {t('transfer.title')}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-400">{t('transfer.desc')}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 flex-1 overflow-y-auto min-h-0 space-y-6">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 flex items-start gap-2 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-5 space-y-4">
            <div className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] items-start sm:items-end gap-3">
              <div className="space-y-1.5 w-full">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase">{t('transfer.from')}</label>
                <select
                  value={fromLocation}
                  onChange={e => setFromLocation(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              
              <div className="pb-2 hidden sm:block">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-400">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-1.5 w-full">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase">{t('transfer.to')}</label>
                <select
                  value={toLocation}
                  onChange={e => setToLocation(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase">{t('transfer.amount')}</label>
                <input
                  type="number"
                  step="0.00000001"
                  placeholder="0.00000000"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase">{t('transfer.date')}</label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={e => setTransferDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none [color-scheme:dark]"
                />
              </div>
            </div>

            <button
              onClick={handleLogTransfer}
              disabled={isSubmitting || !transferAmount || parseFloat(transferAmount) <= 0 || fromLocation === toLocation}
              className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-400 disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('transfer.btn_confirm')}
            </button>
          </div>

          {/* Transfer History */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-400 flex items-center gap-2">
              <History className="h-4 w-4" /> {t('transfer.history')}
            </h4>
            {transfers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                No internal transfers recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {transfers.map(t => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                        <span>{t.amount.toFixed(8)} BTC</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        <span className="text-blue-400">{t.toLocation}</span>
                      </div>
                      <div className="flex gap-2 text-[10px] text-slate-400 dark:text-slate-400 mt-1">
                        <span>{t.date}</span>
                        <span>•</span>
                        <span>From: {t.fromLocation}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTransfer(t.id)}
                      className="rounded p-1.5 text-slate-400 dark:text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
