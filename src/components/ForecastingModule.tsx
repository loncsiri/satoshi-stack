import React, { useMemo, useState, useEffect } from 'react';
import { Target, AlertCircle, Coins } from 'lucide-react';
import type { Transaction, ProjectionModel } from '../types';
import { calculateForecast, calculateStrategyForecast } from '../utils/financeUtils';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ForecastingModuleProps {
  transactions: Transaction[];
  targetBTC: number;
  livePrice: number;
  onTargetChange: (newTarget: number) => void;
  monthlyBudgetTHB: number;
  annualIncreasePercent: number;
  btcAnnualGrowthPercent: number;
  onStrategyChange: (monthlyBudget: number, annualIncrease: number, btcGrowth: number) => void;
  isPrivacyMode?: boolean;
}

export const ForecastingModule: React.FC<ForecastingModuleProps> = ({
  transactions,
  targetBTC,
  livePrice,
  onTargetChange,
  monthlyBudgetTHB,
  annualIncreasePercent,
  btcAnnualGrowthPercent,
  onStrategyChange,
  isPrivacyMode = false,
}) => {
  const { formatFiat, currency, exchangeRate } = useCurrency();
  const { t } = useLanguage();
  const totalBTC = useMemo(() => transactions.reduce((sum, tx) => sum + tx.amount, 0), [transactions]);
  
  const [currentBTCStr, setCurrentBTCStr] = useState<string>(() => {
    const saved = localStorage.getItem('btc_tracker_forecast_current_btc');
    return saved !== null ? saved : totalBTC.toFixed(8);
  });
  const [projectionModel, setProjectionModel] = useState<ProjectionModel>(() => {
    const saved = localStorage.getItem('btc_tracker_forecast_model');
    return (saved as ProjectionModel) || 'power_law';
  });
  
  const updateCurrentBTC = (val: string) => {
    setCurrentBTCStr(val);
    localStorage.setItem('btc_tracker_forecast_current_btc', val);
  };
  
  const updateProjectionModel = (val: ProjectionModel) => {
    setProjectionModel(val);
    localStorage.setItem('btc_tracker_forecast_model', val);
  };

  const activeTotalBTC = parseFloat(currentBTCStr) || 0;

  const forecast = useMemo(() => {
    return calculateForecast(transactions, targetBTC, '2026-06-01', activeTotalBTC);
  }, [transactions, targetBTC, activeTotalBTC]);

  const strategyForecast = useMemo(() => {
    return calculateStrategyForecast(
      forecast.remainingBTC,
      monthlyBudgetTHB,
      livePrice,
      annualIncreasePercent,
      btcAnnualGrowthPercent,
      projectionModel,
      activeTotalBTC
    );
  }, [forecast.remainingBTC, monthlyBudgetTHB, livePrice, annualIncreasePercent, btcAnnualGrowthPercent, projectionModel, activeTotalBTC]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      onTargetChange(value);
    } else if (e.target.value === '') {
      onTargetChange(0);
    }
  };


  const displayBudget = currency === 'THB' 
    ? monthlyBudgetTHB 
    : (monthlyBudgetTHB ? Math.round(monthlyBudgetTHB / exchangeRate) : 0);

  const activeTotalBTCForUI = parseFloat(currentBTCStr) || 0;
  const isGoalReached = activeTotalBTCForUI >= targetBTC;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-6 w-6 text-amber-500" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('forecast.title')}</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Parameters */}
        <div className="lg:col-span-1 space-y-6 min-w-0">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
              {t('forecast.params')}
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="current-btc-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Current BTC Savings
                    </label>
                    <button
                      onClick={() => updateCurrentBTC(totalBTC.toFixed(8))}
                      className="text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded transition-colors"
                      title="Sync from Total Accumulated BTC"
                    >
                      Sync Data
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="current-btc-input"
                      type={isPrivacyMode ? "text" : "number"}
                      step="0.00000001"
                      min="0"
                      value={isPrivacyMode ? "••••" : currentBTCStr}
                      disabled={isPrivacyMode}
                      onChange={(e) => updateCurrentBTC(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-3 pr-12 py-2 text-sm text-slate-900 dark:text-white font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors disabled:opacity-50"
                      placeholder="e.g. 0.5"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-xs font-bold text-amber-500">BTC</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="target-btc-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {t('forecast.target_btc')}
                  </label>
                  <div className="relative">
                    <input
                      id="target-btc-input"
                      type={isPrivacyMode ? "text" : "number"}
                      step="0.01"
                      min="0"
                      value={isPrivacyMode ? "••••" : (targetBTC || '')}
                      disabled={isPrivacyMode}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-3 pr-12 py-2 text-sm text-slate-900 dark:text-white font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors disabled:opacity-50"
                      placeholder="e.g. 1.0"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-xs font-bold text-amber-500">BTC</span>
                    </div>
                  </div>
                </div>
              </div>

              {!isGoalReached && (
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-amber-500" />
                    Strategy Calculator
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label htmlFor="monthly-budget-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {t('forecast.monthly_invest')}
                      </label>
                      <div className="relative">
                        <input
                          id="monthly-budget-input"
                          type="number"
                          value={displayBudget || ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            const budgetTHB = isNaN(val) ? 0 : (currency === 'THB' ? val : val * exchangeRate);
                            onStrategyChange(budgetTHB, annualIncreasePercent, btcAnnualGrowthPercent);
                          }}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                          placeholder={currency === 'THB' ? "e.g. 15000" : "e.g. 500"}
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">{currency}/mo</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label htmlFor="annual-increase-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {t('forecast.annual_increase')}
                        </label>
                        <div className="relative">
                          <input
                            id="annual-increase-input"
                            type="number"
                            value={annualIncreasePercent || ''}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              onStrategyChange(monthlyBudgetTHB, !isNaN(val) ? val : 0, btcAnnualGrowthPercent);
                            }}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                            placeholder="e.g. 5"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">%/yr</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">BTC Price Projection Model</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateProjectionModel('power_law')}
                            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                              projectionModel.startsWith('power_law')
                                ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-800'
                            }`}
                          >
                            Power Law
                          </button>
                          <button
                            onClick={() => updateProjectionModel('cagr')}
                            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                              projectionModel === 'cagr'
                                ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-800'
                            }`}
                          >
                            Fixed CAGR
                          </button>
                        </div>

                        {projectionModel.startsWith('power_law') && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => updateProjectionModel('power_law_bear')}
                              className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition-all ${
                                projectionModel === 'power_law_bear'
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-2 border-rose-500/50'
                                  : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              Bear (Support)
                            </button>
                            <button
                              onClick={() => updateProjectionModel('power_law')}
                              className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition-all ${
                                projectionModel === 'power_law'
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-2 border-amber-500/50'
                                  : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              Avg (Fair)
                            </button>
                            <button
                              onClick={() => setProjectionModel('power_law_bull')}
                              className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition-all ${
                                projectionModel === 'power_law_bull'
                                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-500/50'
                                  : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              Bull (Peak)
                            </button>
                          </div>
                        )}
                      </div>

                      {projectionModel === 'cagr' && (
                        <div className="space-y-1.5">
                          <label htmlFor="btc-growth-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                            {t('forecast.btc_growth')}
                          </label>
                          <div className="relative">
                            <input
                              id="btc-growth-input"
                              type="number"
                              value={btcAnnualGrowthPercent || ''}
                              onChange={e => {
                                const val = parseFloat(e.target.value);
                                onStrategyChange(monthlyBudgetTHB, annualIncreasePercent, !isNaN(val) ? val : 0);
                              }}
                              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                              placeholder="e.g. 10"
                            />
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                              <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">%/yr</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Data and Results */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          
          {/* Top Banner: Progress */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div className="space-y-1 text-center sm:text-left flex-1 w-full">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold text-slate-500 dark:text-slate-400">{t('forecast.progress')}</span>
                <span className="font-bold text-amber-500">
                  {forecast.completionPercent.toFixed(2)}%
                </span>
              </div>
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-all duration-500"
                  style={{ width: `${forecast.completionPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                <span>{isPrivacyMode ? "••••••••" : activeTotalBTCForUI.toFixed(8)} BTC</span>
                <span>{isPrivacyMode ? "••••••••" : targetBTC.toFixed(8)} BTC</span>
              </div>
            </div>
            
            {isGoalReached ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-600 dark:text-emerald-400 font-bold sm:max-w-[200px] text-center w-full sm:w-auto">
                <AlertCircle className="h-5 w-5 shrink-0" />
                {t('forecast.target_reached')}
              </div>
            ) : (
              <>
                <div className="h-12 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
                <div className="space-y-1 text-center sm:text-right flex-1 min-w-0">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('forecast.remaining')}</span>
                  <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white truncate">
                    {isPrivacyMode ? "••••••••" : forecast.remainingBTC.toFixed(8)} <span className="text-base text-amber-500">BTC</span>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Goal Summary */}
          {!isGoalReached && strategyForecast.months > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-5 backdrop-blur-xl">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Time to Target</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-amber-500">
                    {strategyForecast.months === Infinity ? '+1200' : strategyForecast.months}
                  </p>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Months</p>
                </div>
                <p className="text-xs font-medium text-slate-400 mt-1">
                  {strategyForecast.months !== Infinity ? `(~${Math.floor(strategyForecast.months / 12)} Yrs, ${strategyForecast.months % 12} Mos) • ` : ''}{strategyForecast.projectedDate}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-5 backdrop-blur-xl">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Est. BTC Price</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-500 dark:text-emerald-400 truncate">
                  {isPrivacyMode ? (currency === 'THB' ? '฿••••••••' : '$••••••••') : formatFiat(strategyForecast.finalBTCPrice || livePrice)}
                </p>
                <p className="text-xs font-medium text-slate-400 mt-1">
                  {strategyForecast.months === Infinity ? 'At 1200th Month' : 'At Target Month'}
                </p>
              </div>
            </div>
          )}

          {/* Month-by-Month Projection Table */}
          {!isGoalReached && strategyForecast.monthlyData && strategyForecast.monthlyData.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">
                Projection to Goal (Month-by-Month)
              </h3>
              
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-950/50 overflow-hidden">
                <div className="max-h-96 overflow-y-auto overflow-x-auto min-h-0">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 backdrop-blur-md z-10 shadow-sm border-b border-slate-200 dark:border-slate-700/50">
                      <tr>
                        <th className="px-4 py-3 font-semibold uppercase whitespace-nowrap">No. of Month</th>
                        <th className="px-4 py-3 font-semibold uppercase text-right whitespace-nowrap">Monthly Buy</th>
                        <th className="px-4 py-3 font-semibold uppercase text-right whitespace-nowrap">BTC Price</th>
                        <th className="px-4 py-3 font-semibold uppercase text-right whitespace-nowrap">BTC Bought</th>
                        <th className="px-4 py-3 font-semibold uppercase text-right whitespace-nowrap">Total BTC</th>
                        <th className="px-4 py-3 font-semibold uppercase text-right whitespace-nowrap">Market Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {strategyForecast.monthlyData.map((row) => (
                        <tr key={`${row.year}-${row.monthIndex}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {row.monthIndex}
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                ({row.year} - {row.monthStr})
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-emerald-500 dark:text-emerald-400">
                            {isPrivacyMode ? (currency === 'THB' ? '฿••••' : '$••••') : `+${formatFiat(row.monthlyBuyTHB)}`}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                            {formatFiat(row.btcPriceTHB)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-emerald-500 dark:text-emerald-400">
                            {isPrivacyMode ? '••••••••' : `+${row.btcBought.toFixed(8)}`}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-amber-500">
                            {isPrivacyMode ? '••••••••' : row.totalPortfolioBTC.toFixed(8)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                            {isPrivacyMode ? (currency === 'THB' ? '฿••••' : '$••••') : formatFiat(row.portfolioValueTHB)}
                          </td>
                        </tr>
                      ))}
                      {strategyForecast.monthlyData.length > 0 && strategyForecast.monthlyData[strategyForecast.monthlyData.length - 1].totalPortfolioBTC >= targetBTC && (
                        <tr className="bg-emerald-50 dark:bg-emerald-950/20">
                          <td colSpan={6} className="px-4 py-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                              🎉 Target Reached!
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
