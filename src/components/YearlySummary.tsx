import React, { useMemo } from 'react';
import type { Transaction } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowUpRight, ArrowDownRight, Landmark } from 'lucide-react';

interface YearlySummaryProps {
  transactions: Transaction[];
  livePrice: number;
  isPrivacyMode?: boolean;
}

interface YearStats {
  year: string;
  totalBTC: number;
  totalCost: number;
  currentValue: number;
  pnl: number;
  roi: number;
  buyCount: number;
}

export const YearlySummary: React.FC<YearlySummaryProps> = ({ transactions, livePrice, isPrivacyMode = false }) => {
  const { formatFiat, currency } = useCurrency();
  const { t } = useLanguage();
  const yearlyStats = useMemo(() => {
    const statsMap: Record<string, { totalBTC: number; totalCost: number; buyCount: number }> = {};

    for (const tx of transactions) {
      const year = new Date(tx.date).getFullYear().toString();
      if (!statsMap[year]) {
        statsMap[year] = { totalBTC: 0, totalCost: 0, buyCount: 0 };
      }
      statsMap[year].totalBTC += tx.amount;
      statsMap[year].totalCost += tx.spent;
      statsMap[year].buyCount += 1;
    }

    const statsArray: YearStats[] = Object.entries(statsMap).map(([year, data]) => {
      const currentValue = data.totalBTC * livePrice;
      const pnl = currentValue - data.totalCost;
      const roi = data.totalCost > 0 ? (pnl / data.totalCost) * 100 : 0;

      return {
        year,
        totalBTC: data.totalBTC,
        totalCost: data.totalCost,
        currentValue,
        pnl,
        roi,
        buyCount: data.buyCount,
      };
    });

    // Sort years descending (latest first)
    return statsArray.sort((a, b) => b.year.localeCompare(a.year));
  }, [transactions, livePrice]);

  if (yearlyStats.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Landmark className="h-5 w-5 text-amber-500" />
          Yearly Performance Summary
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Historical overview of Bitcoin accumulated and invested fiat capital by calendar year evaluated at current price
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-100 dark:bg-slate-950/60 font-bold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">{t('yearly.col.year')}</th>
              <th className="px-4 py-3 text-right">{t('yearly.col.accumulated')}</th>
              <th className="px-4 py-3 text-right">{t('yearly.col.invested')} ({currency})</th>
              <th className="px-4 py-3 text-right">{t('yearly.col.market_value')} ({currency})</th>
              <th className="px-4 py-3 text-right">{t('yearly.col.pnl')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {yearlyStats.map(stat => {
              const isProfit = stat.pnl >= 0;
              return (
                <tr key={stat.year} className="hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">{stat.year}</span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-500 bg-slate-200 dark:bg-slate-900 px-2 py-0.5 rounded-md">
                        {stat.buyCount} {t('yearly.buys')}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-amber-500 dark:text-amber-400">
                    {isPrivacyMode ? "•••••••• BTC" : `${stat.totalBTC.toFixed(8)} BTC`}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-300">
                    {isPrivacyMode ? (currency === 'THB' ? "฿••••" : "$••••") : formatFiat(stat.totalCost)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-white">
                    {isPrivacyMode ? (currency === 'THB' ? "฿••••" : "$••••") : formatFiat(stat.currentValue)}
                  </td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right font-bold ${
                    isPrivacyMode ? 'text-slate-500 dark:text-slate-400' : (isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
                  }`}>
                    <div className="flex flex-col items-end">
                      <span className="flex items-center gap-1 text-sm">
                        {!isPrivacyMode && (isProfit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />)}
                        {isPrivacyMode ? "฿•••• (•••%)" : `฿${Math.round(stat.pnl).toLocaleString()}`}
                      </span>
                      {!isPrivacyMode && (
                        <span className="text-xs">{stat.roi.toFixed(2)}%</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
