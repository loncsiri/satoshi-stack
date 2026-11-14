import React, { useMemo } from 'react';
import { Flame, Trophy, TrendingUp, CheckCircle2, Circle } from 'lucide-react';
import type { Transaction } from '../types';
import { calculateDCAMetrics } from '../utils/financeUtils';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLanguage } from '../contexts/LanguageContext';

interface DCAMetricsWidgetProps {
  transactions: Transaction[];
  totalBTC: number;
  livePrice: number;
  isPrivacyMode?: boolean;
}

const MILESTONES = [
  { btc: 0.01, label: '1M Sats' },
  { btc: 0.1, label: '10M Sats' },
  { btc: 0.21, label: '1 in 100M' },
  { btc: 0.5, label: 'Half-Coiner' },
  { btc: 1.0, label: 'Wholecoiner' },
];

export const DCAMetricsWidget: React.FC<DCAMetricsWidgetProps> = ({
  transactions,
  totalBTC,
  livePrice,
  isPrivacyMode = false,
}) => {
  const { formatFiat, formatBTC } = useCurrency();
  const { t } = useLanguage();

  const metrics = useMemo(
    () => calculateDCAMetrics(transactions, livePrice),
    [transactions, livePrice]
  );

  if (transactions.length === 0) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* DCA Consistency & Lot Inspector */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-amber-500" />
          <h3 className="font-bold text-slate-900 dark:text-white">{t('dca.title')}</h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {t('dca.current_streak')}
            </div>
            <div className="mt-1 text-xl font-extrabold text-amber-500">
              {metrics.currentStreakMonths}{' '}
              <span className="text-xs font-semibold text-slate-500">{t('dca.months_unit')}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {t('dca.longest_streak')}
            </div>
            <div className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
              {metrics.longestStreakMonths}{' '}
              <span className="text-xs font-semibold text-slate-500">{t('dca.months_unit')}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {t('dca.profitable_buys')}
            </div>
            <div className="mt-1 text-xl font-extrabold text-emerald-500">
              {metrics.profitableBuysPercent.toFixed(0)}%
              <span className="ml-1 text-[11px] font-medium text-slate-400">
                ({metrics.profitableBuysCount}/{metrics.totalBuysCount})
              </span>
            </div>
          </div>
        </div>

        {(metrics.bestBuy || metrics.worstBuy) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {metrics.bestBuy && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    {t('dca.best_buy')}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{metrics.bestBuy.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {isPrivacyMode ? '••••' : formatFiat(metrics.bestBuy.price)}
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-500">
                    {isPrivacyMode ? '••••' : formatBTC(metrics.bestBuy.amount)}
                  </div>
                </div>
              </div>
            )}

            {metrics.worstBuy && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-3.5 py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                    {t('dca.worst_buy')}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{metrics.worstBuy.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {isPrivacyMode ? '••••' : formatFiat(metrics.worstBuy.price)}
                  </div>
                  <div className="text-[10px] font-semibold text-amber-500">
                    {isPrivacyMode ? '••••' : formatBTC(metrics.worstBuy.amount)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bitcoiner Stack Milestones */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 dark:text-white">{t('milestones.title')}</h3>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
            <TrendingUp className="h-3.5 w-3.5" />
            {isPrivacyMode ? '••••••••' : formatBTC(totalBTC)}
          </span>
        </div>

        <div className="space-y-3">
          {MILESTONES.map(m => {
            const achieved = totalBTC >= m.btc;
            const progress = Math.min(100, (totalBTC / m.btc) * 100);

            return (
              <div key={m.btc} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {achieved ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                    <span
                      className={`font-bold ${
                        achieved
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {m.label}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({formatBTC(m.btc, { decimals: 2 })})
                    </span>
                  </div>
                  <span
                    className={`font-bold ${
                      achieved ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isPrivacyMode ? '••%' : `${progress.toFixed(1)}%`}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      achieved ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${isPrivacyMode ? 0 : progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
