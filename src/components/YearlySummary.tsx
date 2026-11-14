import React, { useMemo } from 'react';
import type { Transaction, Transfer } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface YearlySummaryProps {
  transactions: Transaction[];
  livePrice: number;
  isPrivacyMode?: boolean;
  transfers?: Transfer[];
}

interface YearStats {
  year: string;
  totalBTC: number;
  totalCost: number;
  avgCost: number;
  currentValue: number;
  pnl: number;
  roi: number;
  buyCount: number;
  sellCount: number;
  transferCount: number;
}

export const YearlySummary: React.FC<YearlySummaryProps> = ({
  transactions,
  transfers = [],
  livePrice,
  isPrivacyMode = false,
}) => {
  const { formatFiat, formatBTC, currency } = useCurrency();
  const { t } = useLanguage();

  const yearlyStats = useMemo(() => {
    const statsMap: Record<
      string,
      {
        boughtBTC: number;
        boughtCost: number;
        soldBTC: number;
        proceeds: number;
        buyCount: number;
        sellCount: number;
        transferCount: number;
      }
    > = {};

    const ensureYear = (year: string) => {
      if (!statsMap[year]) {
        statsMap[year] = {
          boughtBTC: 0,
          boughtCost: 0,
          soldBTC: 0,
          proceeds: 0,
          buyCount: 0,
          sellCount: 0,
          transferCount: 0,
        };
      }
    };

    for (const tx of transactions) {
      const year = new Date(tx.date).getFullYear().toString();
      ensureYear(year);
      if (tx.amount >= 0) {
        statsMap[year].boughtBTC += tx.amount;
        statsMap[year].boughtCost += tx.spent;
        statsMap[year].buyCount += 1;
      } else {
        statsMap[year].soldBTC += Math.abs(tx.amount);
        statsMap[year].proceeds += Math.abs(tx.spent);
        statsMap[year].sellCount += 1;
      }
    }

    for (const tf of transfers) {
      const year = new Date(tf.date).getFullYear().toString();
      ensureYear(year);
      statsMap[year].transferCount += 1;
    }

    const statsArray: YearStats[] = Object.entries(statsMap).map(([year, data]) => {
      const netBTC = data.boughtBTC - data.soldBTC;
      // Average entry price for that year's buys
      const avgBuyCost = data.boughtBTC > 0 ? data.boughtCost / data.boughtBTC : 0;
      // Remaining cost basis for net BTC accumulated in that year (or net cash outflow if sold more than bought)
      const netCost =
        data.soldBTC > 0 && data.boughtBTC > 0
          ? Math.max(0, data.boughtBTC - data.soldBTC) * avgBuyCost
          : data.boughtCost - data.proceeds;
      const currentValue = netBTC * livePrice;
      const pnl = currentValue - netCost;
      const roi = netCost > 0 ? (pnl / netCost) * 100 : 0;

      return {
        year,
        totalBTC: netBTC,
        totalCost: netCost,
        avgCost: avgBuyCost,
        currentValue,
        pnl,
        roi,
        buyCount: data.buyCount,
        sellCount: data.sellCount,
        transferCount: data.transferCount,
      };
    });

    return statsArray.sort((a, b) => b.year.localeCompare(a.year));
  }, [transactions, transfers, livePrice]);

  if (yearlyStats.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('yearly.perf.title')}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('yearly.perf.subtitle')}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-100 dark:bg-slate-950/60 font-bold uppercase text-slate-800 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">{t('yearly.col.year')}</th>
              <th className="px-4 py-3 text-right">{t('yearly.col.accumulated')}</th>
              <th className="px-4 py-3 text-right">
                {t('yearly.col.avg_cost')} ({currency})
              </th>
              <th className="px-4 py-3 text-right">
                {t('yearly.col.invested')} ({currency})
              </th>
              <th className="px-4 py-3 text-right">
                {t('yearly.col.market_value')} ({currency})
              </th>
              <th className="px-4 py-3 text-right">{t('yearly.col.pnl')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {yearlyStats.map(stat => {
              const isProfit = stat.pnl >= 0;
              const maskedFiat = currency === 'THB' ? '฿••••' : '$••••';
              return (
                <tr
                  key={stat.year}
                  className="hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        {stat.year}
                      </span>
                      <div className="flex flex-col text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-500 bg-slate-200 dark:bg-slate-900 px-2 py-0.5 rounded-md leading-tight gap-0.5">
                        {(stat.buyCount > 0 || stat.sellCount > 0) && (
                          <div className="flex items-center gap-1.5">
                            {stat.buyCount > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {stat.buyCount} {t('yearly.buys')}
                              </span>
                            )}
                            {stat.sellCount > 0 && (
                              <span className="text-rose-500 dark:text-rose-400">
                                {stat.sellCount} {t('yearly.sells')}
                              </span>
                            )}
                          </div>
                        )}
                        {stat.transferCount > 0 && (
                          <div className="text-blue-500 dark:text-blue-400">
                            {stat.transferCount} {t('yearly.transfers')}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-amber-500 dark:text-amber-400">
                    {isPrivacyMode ? '••••••••' : formatBTC(stat.totalBTC)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                    {isPrivacyMode ? maskedFiat : formatFiat(stat.avgCost)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-300">
                    {isPrivacyMode ? maskedFiat : formatFiat(stat.totalCost)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                    {isPrivacyMode ? maskedFiat : formatFiat(stat.currentValue)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-bold ${
                      isPrivacyMode
                        ? 'text-slate-500 dark:text-slate-400'
                        : isProfit
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    <div className="flex flex-col items-end">
                      <span className="flex items-center gap-1 text-sm">
                        {!isPrivacyMode &&
                          (isProfit ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          ))}
                        {isPrivacyMode
                          ? `${maskedFiat} (•••%)`
                          : `${stat.pnl >= 0 ? '+' : ''}${formatFiat(stat.pnl)}`}
                      </span>
                      {!isPrivacyMode && <span className="text-xs">{stat.roi.toFixed(2)}%</span>}
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
