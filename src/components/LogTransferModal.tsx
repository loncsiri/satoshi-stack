import React, { useState, useMemo } from 'react';
import { X, ArrowRight, ArrowRightLeft, AlertTriangle, Loader2 } from 'lucide-react';
import type { AppSettings, Transfer } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { getTodayDateStr } from '../utils/financeUtils';

interface LogTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  transfers: Transfer[];
  onSaveTransfers: (transfers: Transfer[]) => void;
  editingTransfer?: Transfer | null;
}

export const LogTransferModal: React.FC<LogTransferModalProps> = ({
  isOpen,
  onClose,
  settings,
  transfers,
  onSaveTransfers,
  editingTransfer = null,
}) => {
  const { t } = useLanguage();
  const { formatBTC } = useCurrency();
  const locations = useMemo(
    () =>
      settings.vaultLocations && settings.vaultLocations.length > 0
        ? settings.vaultLocations
        : ['Exchange', 'Trezor'],
    [settings.vaultLocations]
  );

  const isEditing = Boolean(editingTransfer);

  const [fromLocation, setFromLocation] = useState<string>(() =>
    editingTransfer ? editingTransfer.fromLocation : locations[0] || 'Exchange'
  );
  const [toLocation, setToLocation] = useState<string>(() =>
    editingTransfer
      ? editingTransfer.toLocation
      : locations.length > 1
      ? locations[1]
      : 'Exchange'
  );
  const [transferAmount, setTransferAmount] = useState<string>(() =>
    editingTransfer ? editingTransfer.amount.toString() : ''
  );
  const [transferFee, setTransferFee] = useState<string>(() =>
    editingTransfer?.fee ? editingTransfer.fee.toString() : ''
  );
  const [transferDate, setTransferDate] = useState<string>(() =>
    editingTransfer ? editingTransfer.date : getTodayDateStr()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeFrom = locations.includes(fromLocation)
    ? fromLocation
    : locations[0] || 'Exchange';
  const activeTo = locations.includes(toLocation)
    ? toLocation
    : locations.length > 1
    ? locations[1]
    : 'Exchange';

  const parsedAmount = parseFloat(transferAmount) || 0;
  const parsedFee = parseFloat(transferFee) || 0;
  const netReceived = Math.max(0, parsedAmount - parsedFee);

  const handleLogTransfer = async () => {
    const amt = parseFloat(transferAmount);
    const feeVal = parseFloat(transferFee);
    const cleanFee = !isNaN(feeVal) && feeVal > 0 ? feeVal : undefined;

    if (isNaN(amt) || amt <= 0) return;
    if (activeFrom === activeTo) return;
    if (cleanFee && cleanFee >= amt) {
      setError('Network fee cannot exceed transfer amount.');
      return;
    }

    if (settings.dataSource === 'google-sheet' && !settings.webhookUrl) {
      setError(t('add_tx.setup_required'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && editingTransfer && settings.dataSource === 'local-storage') {
        const updatedTransfers = transfers.map(tf =>
          tf.id === editingTransfer.id
            ? {
                ...tf,
                date: transferDate,
                amount: amt,
                fee: cleanFee,
                fromLocation: activeFrom,
                toLocation: activeTo,
              }
            : tf
        );
        onSaveTransfers(updatedTransfers);
        onClose();
        return;
      }

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
            fee: cleanFee || 0,
            location: activeTo,
            fromLocation: activeFrom,
          }),
        });
      }

      const newTransfer: Transfer = {
        id: `tr-${Date.now()}`,
        date: transferDate,
        amount: amt,
        fee: cleanFee,
        fromLocation: activeFrom,
        toLocation: activeTo,
      };

      const updatedTransfers = [...transfers, newTransfer];
      onSaveTransfers(updatedTransfers);

      setTransferAmount('');
      setTransferFee('');
      onClose();
    } catch (err) {
      console.error(err);
      setError(t('add_tx.error_submit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex flex-col w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl max-h-[90dvh] overflow-hidden z-10 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-400" />
              {isEditing ? t('transfer.edit_title') : t('transfer.title')}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-400">{t('transfer.desc')}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {t('transfer.from')}
                </label>
                <select
                  value={activeFrom}
                  onChange={e => setFromLocation(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  {locations.map(l => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pb-2 hidden sm:block">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-1.5 w-full">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {t('transfer.to')}
                </label>
                <select
                  value={activeTo}
                  onChange={e => setToLocation(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  {locations.map(l => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {t('transfer.amount')}
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  min="0"
                  placeholder="0.00000000"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {t('transfer.fee')}
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  min="0"
                  placeholder="0.00000000"
                  value={transferFee}
                  onChange={e => setTransferFee(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {t('transfer.date')}
                </label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={e => setTransferDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none dark:[color-scheme:dark]"
                />
              </div>
            </div>

            {parsedAmount > 0 && parsedFee > 0 && (
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
                <span>{t('transfer.net_received')}:</span>
                <span className="font-bold text-blue-500">{formatBTC(netReceived)}</span>
              </div>
            )}

            <button
              onClick={handleLogTransfer}
              disabled={
                isSubmitting ||
                !transferAmount ||
                parseFloat(transferAmount) <= 0 ||
                activeFrom === activeTo
              }
              className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-400 disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? t('transfer.btn_update') : t('transfer.btn_confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
