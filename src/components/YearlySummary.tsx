import React, { useMemo } from 'react';
import type { Transaction, Transfer } from '../types';
import { calculateYearlyStats } from '../utils/financeUtils';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface YearlySummaryProps {
  transactions: Transaction[];
  livePrice: number;
  isPrivacyMode?: boolean;
  transfers?: Transfer[];
}

export const YearlySummary: React.FC<YearlySummaryProps> = ({
  transactions,
  transfers = [],
  livePrice,
  isPrivacyMode = false,
}) => {
  const { formatFiat, formatBTC, currency } = useCurrency();
  const { t } = useLanguage();

  const yearlyStats = useMemo(
    () => calculateYearlyStats(transactions, livePrice, transfers),
    [transactions, transfers, livePrice]
  );

  const totals = useMemo(() => {
    const totalBTC = yearlyStats.reduce((sum, s) => sum + s.totalBTC, 0);
    const totalCostBasis = yearlyStats.reduce((sum, s) => sum + s.netCostBasis, 0);
    const totalCashFlow = yearlyStats.reduce((sum, s) => sum + s.netCashFlow, 0);
    const totalProceeds = yearlyStats.reduce((sum, s) => sum + s.proceeds, 0);
    const totalRealizedPNL = yearlyStats.reduce((sum, s) => sum + s.realizedPNL, 0);
    const totalMarketValue = yearlyStats.reduce((sum, s) => sum + s.currentValue, 0);
    const totalUnrealizedPNL = yearlyStats.reduce((sum, s) => sum + s.unrealizedPNL, 0);
    const totalROI = totalCostBasis > 0 ? (totalUnrealizedPNL / totalCostBasis) * 100 : 0;
    const portfolioAvgCost = totalBTC > 0 ? totalCostBasis / totalBTC : 0;
    const totalBuys = yearlyStats.reduce((sum, s) => sum + s.buyCount, 0);
    const totalSells = yearlyStats.reduce((sum, s) => sum + s.sellCount, 0);
    const totalTransfers = yearlyStats.reduce((sum, s) => sum + s.transferCount, 0);

    return {
      totalBTC,
      totalCostBasis,
      totalCashFlow,
      totalProceeds,
      totalRealizedPNL,
      totalMarketValue,
      totalUnrealizedPNL,
      totalROI,
      portfolioAvgCost,
      totalBuys,
      totalSells,
      totalTransfers,
    };
  }, [yearlyStats]);

  if (yearlyStats.length === 0) return null;

  const maskedFiat = currency === 'THB' ? '฿••••' : '$••••';
  const isTotalProfit = totals.totalUnrealizedPNL >= 0;

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
              const isProfit = stat.unrealizedPNL >= 0;
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
                    {isPrivacyMode
                      ? maskedFiat
                      : stat.boughtBTC > 0
                      ? formatFiat(stat.avgCost)
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-300">
                    <div>{isPrivacyMode ? maskedFiat : formatFiat(stat.netCostBasis)}</div>
                    {stat.sellCount > 0 && (
                      <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('yearly.cash_flow')}:{' '}
                        {isPrivacyMode ? maskedFiat : formatFiat(stat.netCashFlow)}
                      </div>
                    )}
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
                          : `${stat.unrealizedPNL >= 0 ? '+' : ''}${formatFiat(stat.unrealizedPNL)}`}
                      </span>
                      {!isPrivacyMode && (
                        <span className="text-xs">
                          {stat.netCostBasis > 0 ? `${stat.roi.toFixed(2)}%` : '—'}
                        </span>
                      )}
                      {Math.abs(stat.realizedPNL) >= 0.01 && (
                        <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                          {t('yearly.realized')}:{' '}
                          {isPrivacyMode
                            ? maskedFiat
                            : `${stat.realizedPNL >= 0 ? '+' : ''}${formatFiat(stat.realizedPNL)}`}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100/90 dark:bg-slate-950/70 border-t-2 border-slate-200 dark:border-slate-700/80 font-bold">
            <tr>
              <td className="whitespace-nowrap px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold uppercase tracking-wide text-slate-900 dark:text-white">
                    {t('yearly.total')}
                  </span>
                  <div className="flex flex-col text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-900 px-2 py-0.5 rounded-md leading-tight gap-0.5">
                    {(totals.totalBuys > 0 || totals.totalSells > 0) && (
                      <div className="flex items-center gap-1.5">
                        {totals.totalBuys > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {totals.totalBuys} {t('yearly.buys')}
                          </span>
                        )}
                        {totals.totalSells > 0 && (
                          <span className="text-rose-500 dark:text-rose-400">
                            {totals.totalSells} {t('yearly.sells')}
                          </span>
                        )}
                      </div>
                    )}
                    {totals.totalTransfers > 0 && (
                      <div className="text-blue-500 dark:text-blue-400">
                        {totals.totalTransfers} {t('yearly.transfers')}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right font-extrabold text-amber-500 dark:text-amber-400">
                {isPrivacyMode ? '••••••••' : formatBTC(totals.totalBTC)}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-300">
                {isPrivacyMode
                  ? maskedFiat
                  : totals.totalBTC > 0
                  ? formatFiat(totals.portfolioAvgCost)
                  : '—'}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold text-slate-900 dark:text-white">
                <div>{isPrivacyMode ? maskedFiat : formatFiat(totals.totalCostBasis)}</div>
                {totals.totalProceeds > 0 && (
                  <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('yearly.cash_flow')}:{' '}
                    {isPrivacyMode ? maskedFiat : formatFiat(totals.totalCashFlow)}
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right font-extrabold text-slate-900 dark:text-white">
                {isPrivacyMode ? maskedFiat : formatFiat(totals.totalMarketValue)}
              </td>
              <td
                className={`whitespace-nowrap px-4 py-3.5 text-right font-extrabold ${
                  isPrivacyMode
                    ? 'text-slate-500 dark:text-slate-400'
                    : isTotalProfit
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                <div className="flex flex-col items-end">
                  <span className="flex items-center gap-1 text-sm">
                    {!isPrivacyMode &&
                      (isTotalProfit ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      ))}
                    {isPrivacyMode
                      ? `${maskedFiat} (•••%)`
                      : `${totals.totalUnrealizedPNL >= 0 ? '+' : ''}${formatFiat(totals.totalUnrealizedPNL)}`}
                  </span>
                  {!isPrivacyMode && (
                    <span className="text-xs">
                      {totals.totalCostBasis > 0 ? `${totals.totalROI.toFixed(2)}%` : '—'}
                    </span>
                  )}
                  {Math.abs(totals.totalRealizedPNL) >= 0.01 && (
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('yearly.realized')}:{' '}
                      {isPrivacyMode
                        ? maskedFiat
                        : `${totals.totalRealizedPNL >= 0 ? '+' : ''}${formatFiat(totals.totalRealizedPNL)}`}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
