import React, { useState } from 'react';
import { X, Plus, Pencil, AlertTriangle, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { getTodayDateStr } from '../utils/financeUtils';
import type { Transaction } from '../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl?: string;
  vaultLocations: string[];
  onSuccess: () => void;
  onOpenSettings: () => void;
  isLocalStorageMode?: boolean;
  onAddLocalTransaction?: (tx: {
    date: string;
    amount: number;
    spent: number;
    location: string;
  }) => void;
  editingTransaction?: Transaction | null;
  onUpdateLocalTransaction?: (tx: Transaction) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  webhookUrl,
  vaultLocations,
  onSuccess,
  onOpenSettings,
  isLocalStorageMode = false,
  onAddLocalTransaction,
  editingTransaction = null,
  onUpdateLocalTransaction,
}) => {
  const { t } = useLanguage();
  const { currency, exchangeRate } = useCurrency();
  const safeVaultLocations =
    vaultLocations && vaultLocations.length > 0 ? vaultLocations : ['Exchange'];

  const isEditing = Boolean(editingTransaction);

  const [txType, setTxType] = useState<'buy' | 'sell'>(() =>
    editingTransaction && editingTransaction.amount < 0 ? 'sell' : 'buy'
  );
  const [date, setDate] = useState(() =>
    editingTransaction ? editingTransaction.date : getTodayDateStr()
  );
  const [btc, setBtc] = useState(() =>
    editingTransaction ? Math.abs(editingTransaction.amount).toString() : ''
  );
  const [fiat, setFiat] = useState(() => {
    if (!editingTransaction) return '';
    const absTHB = Math.abs(editingTransaction.spent);
    const displayVal = currency === 'USD' ? absTHB / exchangeRate : absTHB;
    return Number(displayVal.toFixed(2)).toString();
  });
  const [location, setLocation] = useState(() =>
    editingTransaction?.location || safeVaultLocations[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  if (!webhookUrl && !isLocalStorageMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('add_tx.setup_required')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('add_tx.setup_desc')}
            </p>
            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="mt-4 rounded-xl bg-indigo-500 px-6 py-2.5 font-bold text-white hover:bg-indigo-600 transition-colors"
            >
              {t('add_tx.open_settings')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBtc = parseFloat(btc);
    const parsedFiat = parseFloat(fiat);

    if (!date || isNaN(parsedBtc) || parsedBtc <= 0 || isNaN(parsedFiat) || parsedFiat <= 0) {
      setError(t('add_tx.error_fields'));
      return;
    }

    const fiatInTHB = currency === 'USD' ? parsedFiat * exchangeRate : parsedFiat;
    const signedBtc = txType === 'sell' ? -Math.abs(parsedBtc) : Math.abs(parsedBtc);
    const signedFiatTHB = txType === 'sell' ? -Math.abs(fiatInTHB) : Math.abs(fiatInTHB);

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && editingTransaction && isLocalStorageMode && onUpdateLocalTransaction) {
        onUpdateLocalTransaction({
          ...editingTransaction,
          date,
          amount: signedBtc,
          spent: signedFiatTHB,
          price: Math.abs(signedFiatTHB / signedBtc),
          location,
        });
        onSuccess();
        onClose();
      } else if (isLocalStorageMode && onAddLocalTransaction) {
        onAddLocalTransaction({
          date,
          amount: signedBtc,
          spent: signedFiatTHB,
          location,
        });
        onSuccess();
        setBtc('');
        setFiat('');
        onClose();
      } else if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify({
            date,
            btc: signedBtc,
            fiat: signedFiatTHB,
            location,
          }),
        });

        onSuccess();
        setBtc('');
        setFiat('');
        onClose();
      }
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
        className="absolute inset-0 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative flex flex-col w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl max-h-[90dvh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              {isEditing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {isEditing ? t('add_tx.edit_title') : t('add_tx.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto min-h-0 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 flex items-start gap-2 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Buy / Sell Mode Toggle */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setTxType('buy')}
              className={`rounded-lg py-2 text-xs font-bold transition-all ${
                txType === 'buy'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('add_tx.type_buy')}
            </button>
            <button
              type="button"
              onClick={() => setTxType('sell')}
              className={`rounded-lg py-2 text-xs font-bold transition-all ${
                txType === 'sell'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('add_tx.type_sell')}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {t('add_tx.location')}
                </label>
                <select
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                >
                  {safeVaultLocations.map(loc => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {t('add_tx.date')}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none dark:[color-scheme:dark]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {t('add_tx.btc')}
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  min="0"
                  value={btc}
                  onChange={e => setBtc(e.target.value)}
                  placeholder="0.00000000"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {t('add_tx.fiat')} ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fiat}
                  onChange={e => setFiat(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full rounded-lg py-2.5 text-sm font-bold text-white transition-colors flex items-center justify-center disabled:opacity-70 mt-2 ${
                txType === 'buy'
                  ? 'bg-indigo-500 hover:bg-indigo-600'
                  : 'bg-rose-500 hover:bg-rose-600'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEditing ? (
                t('add_tx.update')
              ) : (
                t('add_tx.save')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
