import React, { useMemo } from 'react';
import { Target, TrendingUp, Calendar, AlertCircle, Coins } from 'lucide-react';
import type { Transaction } from '../types';
import { calculateForecast, calculateStrategyForecast } from '../utils/financeUtils';

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
  const formatFiat = (btcAmount: number) => {
    if (isPrivacyMode) return '฿•••• THB';
    const fiatVal = btcAmount * livePrice;
    return `฿${Math.round(fiatVal).toLocaleString()} THB`;
  };

  const isGoalReached = totalBTC >= targetBTC;

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-xl space-y-6">
      {/* Module Title */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Target className="h-5 w-5 text-amber-500" />
          Goal & Accumulation Forecast
        </h2>
        <p className="text-xs text-slate-400">
          Set your Bitcoin target, analyze your historical performance, and view timeframe projections
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Side: Goal Setting & Progress */}
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
            <label htmlFor="target-btc-input" className="block text-sm font-semibold text-slate-300">
              Set Target BTC Amount
            </label>
            <div className="relative rounded-lg shadow-sm">
              <input
                id="target-btc-input"
                type={isPrivacyMode ? "text" : "number"}
                step="0.01"
                min="0"
                value={isPrivacyMode ? "••••" : (targetBTC || '')}
                disabled={isPrivacyMode}
                onChange={handleInputChange}
                className="block w-full rounded-xl border border-amber-500/35 bg-slate-950/70 pl-4 pr-16 py-3 text-white font-extrabold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all hover:border-amber-500/60 disabled:opacity-55"
                placeholder="Enter target BTC"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <span className="text-sm font-bold text-amber-500">BTC</span>
              </div>
            </div>
          </div>

          {/* Progress Bar Panel */}
          <div className="rounded-xl border border-slate-800/50 bg-slate-900/20 p-4.5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-400">Progress to Goal</span>
              <span className="font-bold text-amber-400">
                {forecast.completionPercent.toFixed(2)}%
              </span>
            </div>
            
            {/* The actual progress bar */}
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-950">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-500"
                style={{ width: `${forecast.completionPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-slate-500">
              <span>Accumulated: {isPrivacyMode ? "••••••••" : totalBTC.toFixed(8)} BTC</span>
              <span>Target: {isPrivacyMode ? "••••••••" : targetBTC.toFixed(8)} BTC</span>
            </div>

            {isGoalReached ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-400 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Congratulations! You have reached your BTC target! 🎉
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-950/40 p-2 text-xs text-slate-400">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-500/80" />
                <span>Need <strong className="text-white">{isPrivacyMode ? "••••••••" : forecast.remainingBTC.toFixed(8)} BTC</strong> to complete target.</span>
              </div>
            )}
          </div>

          {/* Strategy Calculator Panel */}
          {!isGoalReached && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-4">
              <div className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-amber-500" />
                Planned Strategy Calculator
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Monthly budget input */}
                <div className="space-y-1">
                  <label htmlFor="monthly-budget-input" className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block truncate">
                    Monthly Invest
                  </label>
                  <input
                    id="monthly-budget-input"
                    type="number"
                    value={monthlyBudgetTHB || ''}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      onStrategyChange(!isNaN(val) ? val : 0, annualIncreasePercent, btcAnnualGrowthPercent);
                    }}
                    className="block w-full rounded-lg border border-amber-500/35 bg-slate-950/70 px-2 py-1.5 text-xs text-white font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:shadow-[0_0_10px_rgba(245,158,11,0.2)] transition-all hover:border-amber-500/60"
                    placeholder="e.g. 10000"
                  />
                </div>

                {/* Annual increase rate input */}
                <div className="space-y-1">
                  <label htmlFor="annual-increase-input" className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block truncate">
                    Savings +% / Yr
                  </label>
                  <input
                    id="annual-increase-input"
                    type="number"
                    value={annualIncreasePercent || ''}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      onStrategyChange(monthlyBudgetTHB, !isNaN(val) ? val : 0, btcAnnualGrowthPercent);
                    }}
                    className="block w-full rounded-lg border border-amber-500/35 bg-slate-950/70 px-2 py-1.5 text-xs text-white font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:shadow-[0_0_10px_rgba(245,158,11,0.2)] transition-all hover:border-amber-500/60"
                    placeholder="e.g. 5"
                  />
                </div>

                {/* BTC price growth input */}
                <div className="space-y-1">
                  <label htmlFor="btc-growth-input" className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block truncate">
                    BTC Price +% / Yr
                  </label>
                  <input
                    id="btc-growth-input"
                    type="number"
                    value={btcAnnualGrowthPercent || ''}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      onStrategyChange(monthlyBudgetTHB, annualIncreasePercent, !isNaN(val) ? val : 0);
                    }}
                    className="block w-full rounded-lg border border-amber-500/35 bg-slate-950/70 px-2 py-1.5 text-xs text-white font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:shadow-[0_0_10px_rgba(245,158,11,0.2)] transition-all hover:border-amber-500/60"
                    placeholder="e.g. 10"
                  />
                </div>
              </div>

              {/* Strategy Results Panel */}
              <div className="rounded-lg bg-slate-950/60 p-3 space-y-2 border border-slate-900">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Planned Timeframe:</span>
                  <span className="font-extrabold text-amber-400 text-sm">
                    {strategyForecast.months === Infinity
                      ? 'Never'
                      : `${strategyForecast.months.toFixed(1)} Months`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Planned Target Date:</span>
                  <span className="font-semibold text-white">
                    {strategyForecast.projectedDate}
                  </span>
                </div>

                {/* Strategy speed comparison */}
                {strategyForecast.months !== Infinity && forecast.monthsToTarget !== Infinity && (
                  <div className="border-t border-slate-900/65 pt-2 mt-2 text-[10px] font-medium text-center">
                    {forecast.monthsToTarget > strategyForecast.months ? (
                      <span className="text-emerald-400">
                        🚀 Saves <strong>{(forecast.monthsToTarget - strategyForecast.months).toFixed(1)} months</strong> vs. historical rate!
                      </span>
                    ) : forecast.monthsToTarget < strategyForecast.months ? (
                      <span className="text-amber-500/80">
                        ⚠️ Slower by <strong>{(strategyForecast.months - forecast.monthsToTarget).toFixed(1)} months</strong> vs. historical rate.
                      </span>
                    ) : (
                      <span className="text-slate-400"> Matches your historical average accumulation rate.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Projections */}
        <div className="space-y-4">
          <div className="space-y-3">
            {/* Historic Rate */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                Historical Average Monthly Rate
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <p className="text-xl font-extrabold text-white">
                  {isPrivacyMode ? "••••••••" : forecast.avgMonthlyAccumulation.toFixed(8)} <span className="text-amber-500 text-sm font-semibold">BTC</span>
                </p>
                <p className="text-xs font-semibold text-slate-300">
                  ~ {formatFiat(forecast.avgMonthlyAccumulation)} / month
                </p>
              </div>
            </div>

            {/* Estimated Timeframe */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Calendar className="h-4 w-4 text-emerald-400" />
                Estimated Time to Target
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <p className="text-xl font-extrabold text-white">
                  {isGoalReached
                    ? '0 Months'
                    : forecast.monthsToTarget === Infinity
                    ? 'Never'
                    : `${forecast.monthsToTarget.toFixed(1)} Months`}
                </p>
                <p className="text-xs font-semibold text-emerald-400">
                  {isGoalReached ? 'Completed!' : `Target Date: ${forecast.projectedDate}`}
                </p>
              </div>
            </div>
          </div>

          {/* Timeframe Rate Planning */}
          {!isGoalReached && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Required Monthly Rate to Hit Goal
              </span>
              
              <div className="space-y-2">
                {/* 1 Year projection */}
                <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
                  <span className="font-semibold text-slate-400">In 1 Year (12 Months)</span>
                  <div className="text-right">
                    <span className="font-bold text-white block">
                      {isPrivacyMode ? "••••••••" : forecast.rateFor1Y.toFixed(8)} BTC/mo
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ~{formatFiat(forecast.rateFor1Y)}/mo
                    </span>
                  </div>
                </div>

                {/* 5 Years projection */}
                <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
                  <span className="font-semibold text-slate-400">In 5 Years (60 Months)</span>
                  <div className="text-right">
                    <span className="font-bold text-white block">
                      {isPrivacyMode ? "••••••••" : forecast.rateFor5Y.toFixed(8)} BTC/mo
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ~{formatFiat(forecast.rateFor5Y)}/mo
                    </span>
                  </div>
                </div>

                {/* 10 Years projection */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-400">In 10 Years (120 Months)</span>
                  <div className="text-right">
                    <span className="font-bold text-white block">
                      {isPrivacyMode ? "••••••••" : forecast.rateFor10Y.toFixed(8)} BTC/mo
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ~{formatFiat(forecast.rateFor10Y)}/mo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
