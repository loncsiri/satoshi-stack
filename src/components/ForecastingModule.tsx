import React, { useMemo } from 'react';
import { Target, TrendingUp, Calendar, AlertCircle, Coins } from 'lucide-react';
import type { Transaction } from '../types';
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
  
  const forecast = useMemo(() => {
    return calculateForecast(transactions, targetBTC);
  }, [transactions, targetBTC]);

  const strategyForecast = useMemo(() => {
    return calculateStrategyForecast(
      forecast.remainingBTC,
      monthlyBudgetTHB,
      livePrice,
      annualIncreasePercent,
      btcAnnualGrowthPercent
    );
  }, [forecast.remainingBTC, monthlyBudgetTHB, livePrice, annualIncreasePercent, btcAnnualGrowthPercent]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      onTargetChange(value);
    } else if (e.target.value === '') {
      onTargetChange(0);
    }
  };

  // Helper to format fiat THB estimates
  const formatFiatForecast = (btcAmount: number) => {
    if (isPrivacyMode) return currency === 'THB' ? '฿••••' : '$••••';
    const fiatVal = btcAmount * livePrice; // livePrice is priceTHB
    return formatFiat(fiatVal);
  };
  
  const displayBudget = currency === 'THB' 
    ? monthlyBudgetTHB 
    : (monthlyBudgetTHB ? Math.round(monthlyBudgetTHB / exchangeRate) : 0);

  const isGoalReached = totalBTC >= targetBTC;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-6 w-6 text-amber-500" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('forecast.title')}</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Parameters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
              {t('forecast.params')}
            </h3>
            
            <div className="space-y-6">
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

              {!isGoalReached && (
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-amber-500" />
                    Strategy Calculator
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label htmlFor="monthly-budget-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {t('forecast.monthly_invest')} ({currency})
                      </label>
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
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label htmlFor="annual-increase-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {t('forecast.annual_increase')}
                        </label>
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
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="btc-growth-input" className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {t('forecast.btc_growth')}
                        </label>
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
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Data and Results */}
        <div className="lg:col-span-2 space-y-6">
          
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
                <span>{isPrivacyMode ? "••••••••" : totalBTC.toFixed(8)} BTC</span>
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
                <div className="space-y-1 text-center sm:text-right flex-1">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('forecast.remaining')}</span>
                  <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white">
                    {isPrivacyMode ? "••••••••" : forecast.remainingBTC.toFixed(8)} <span className="text-base text-amber-500">BTC</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Historical Projection Panel */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                {t('forecast.hist.title')}
              </h3>
              
              <div className="space-y-1 border-b border-slate-200 dark:border-slate-800/80 pb-4">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('forecast.hist.avg_acc')}</span>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {isPrivacyMode ? "••••••••" : forecast.avgMonthlyAccumulation.toFixed(8)} <span className="text-sm text-emerald-500">BTC</span>
                </p>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  ~ {formatFiatForecast(forecast.avgMonthlyAccumulation)} / mo
                </p>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('forecast.hist.time')}</span>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {isGoalReached ? '0 Months' : forecast.monthsToTarget === Infinity ? 'Never' : `${forecast.monthsToTarget.toFixed(1)} Months`}
                </p>
                <p className="text-xs font-bold text-emerald-500 dark:text-emerald-400">
                  {isGoalReached ? 'Completed!' : `Target: ${forecast.projectedDate}`}
                </p>
              </div>
            </div>

            {/* Strategy Comparison Panel */}
            {!isGoalReached && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  {t('forecast.plan.title')}
                </h3>
                
                <div className="space-y-1 border-b border-slate-200 dark:border-slate-800/80 pb-4">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('forecast.plan.timeframe')}</span>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {strategyForecast.months === Infinity ? 'Never' : `${strategyForecast.months.toFixed(1)} Months`}
                  </p>
                  <p className="text-xs font-bold text-blue-500 dark:text-blue-400">
                    Target: {strategyForecast.projectedDate}
                  </p>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('forecast.plan.compare')}</span>
                  {strategyForecast.months !== Infinity && forecast.monthsToTarget !== Infinity ? (
                    forecast.monthsToTarget > strategyForecast.months ? (
                      <p className="text-sm font-bold text-emerald-500 dark:text-emerald-400 leading-tight">
                        🚀 Saves {(forecast.monthsToTarget - strategyForecast.months).toFixed(1)} months
                      </p>
                    ) : forecast.monthsToTarget < strategyForecast.months ? (
                      <p className="text-sm font-bold text-amber-500 leading-tight">
                        ⚠️ Slower by {(strategyForecast.months - forecast.monthsToTarget).toFixed(1)} months
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Matches historic rate</p>
                    )
                  ) : (
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Not enough data to compare</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Required Rates Table */}
          {!isGoalReached && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">
                {t('forecast.req.title')}
              </h3>
              
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-950/50 p-4">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs">{t('forecast.req.1y')}</span>
                  <p className="font-extrabold text-slate-900 dark:text-white mt-1">
                    {isPrivacyMode ? "••••••••" : forecast.rateFor1Y.toFixed(8)} <span className="text-xs text-amber-500">BTC</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ~{formatFiatForecast(forecast.rateFor1Y)}/mo
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-950/50 p-4">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs">{t('forecast.req.5y')}</span>
                  <p className="font-extrabold text-slate-900 dark:text-white mt-1">
                    {isPrivacyMode ? "••••••••" : forecast.rateFor5Y.toFixed(8)} <span className="text-xs text-amber-500">BTC</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ~{formatFiatForecast(forecast.rateFor5Y)}/mo
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-950/50 p-4">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs">{t('forecast.req.10y')}</span>
                  <p className="font-extrabold text-slate-900 dark:text-white mt-1">
                    {isPrivacyMode ? "••••••••" : forecast.rateFor10Y.toFixed(8)} <span className="text-xs text-amber-500">BTC</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ~{formatFiatForecast(forecast.rateFor10Y)}/mo
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
