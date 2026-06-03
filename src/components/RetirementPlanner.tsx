import React, { useState, useMemo } from 'react';
import { calculateRetirementSimulation } from '../utils/retirementUtils';
import type { RetirementInputs, ProjectionModel } from '../types';
import { Target } from 'lucide-react';

interface RetirementPlannerProps {
  currentBTC: number;
  livePrice: number;
  monthlyBudgetTHB: number;
  isPrivacyMode: boolean;
}

export const RetirementPlanner: React.FC<RetirementPlannerProps> = ({
  currentBTC,
  livePrice,
  monthlyBudgetTHB,
  isPrivacyMode
}) => {
  const [inputs, setInputs] = useState<RetirementInputs>(() => {
    const saved = localStorage.getItem('btc_tracker_retirement_inputs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure new field defaults gracefully if they had old saved data
        if (parsed.pensionIncomeTHB === undefined) parsed.pensionIncomeTHB = 0;
        return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return {
      currentAge: 30,
      lifeExpectancy: 90,
      currentSavingsBTC: currentBTC,
      monthlyBuyTHB: monthlyBudgetTHB,
      savingsIncreaseRate: 0,
      desiredRetirementIncomeTHB: 50000,
      pensionIncomeTHB: 0,
      inflationRate: 3,
      bitcoinCagr: 15,
      projectionModel: 'power_law',
    };
  });

  const updateInputs = (newInputs: RetirementInputs) => {
    setInputs(newInputs);
    localStorage.setItem('btc_tracker_retirement_inputs', JSON.stringify(newInputs));
  };

  const handleInputChange = (field: keyof RetirementInputs, value: string) => {
    const parsed = parseFloat(value);
    updateInputs({
      ...inputs,
      [field]: isNaN(parsed) ? 0 : parsed
    });
  };

  const handleModelChange = (model: ProjectionModel) => {
    updateInputs({ ...inputs, projectionModel: model });
  };

  const simulation = useMemo(() => {
    return calculateRetirementSimulation(inputs, livePrice);
  }, [inputs, livePrice]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-6 w-6 text-emerald-500" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bitcoin Retirement Planner</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
              Parameters
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Age</label>
                  <input
                    type="number"
                    value={inputs.currentAge || ''}
                    onChange={e => handleInputChange('currentAge', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Life Expectancy</label>
                  <input
                    type="number"
                    value={inputs.lifeExpectancy || ''}
                    onChange={e => handleInputChange('lifeExpectancy', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current BTC Savings</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.00000001"
                    disabled={isPrivacyMode}
                    value={isPrivacyMode ? '' : (inputs.currentSavingsBTC ?? '')}
                    onChange={e => handleInputChange('currentSavingsBTC', e.target.value)}
                    placeholder={isPrivacyMode ? "••••••••" : ""}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs font-bold text-amber-500">BTC</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Buy (THB)</label>
                <div className="relative">
                  <input
                    type="number"
                    disabled={isPrivacyMode}
                    value={isPrivacyMode ? '' : (inputs.monthlyBuyTHB || '')}
                    onChange={e => handleInputChange('monthlyBuyTHB', e.target.value)}
                    placeholder={isPrivacyMode ? "••••" : ""}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs font-bold text-slate-400">THB</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Annual Increase in Monthly Buy (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.savingsIncreaseRate || ''}
                    onChange={e => handleInputChange('savingsIncreaseRate', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">%/yr</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Desired Retirement Income (Monthly)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={inputs.desiredRetirementIncomeTHB || ''}
                    onChange={e => handleInputChange('desiredRetirementIncomeTHB', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">THB/mo</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pension / Passive Income (Monthly)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={inputs.pensionIncomeTHB || ''}
                    onChange={e => handleInputChange('pensionIncomeTHB', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs font-bold text-blue-500 dark:text-blue-400">THB/mo</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Inflation Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inputs.inflationRate || ''}
                  onChange={e => handleInputChange('inflationRate', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">BTC Price Projection Model</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleModelChange('power_law')}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                      inputs.projectionModel === 'power_law'
                        ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-800'
                    }`}
                  >
                    Power Law
                  </button>
                  <button
                    onClick={() => handleModelChange('cagr')}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                      inputs.projectionModel === 'cagr'
                        ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-800'
                    }`}
                  >
                    Fixed CAGR
                  </button>
                </div>
              </div>

              {inputs.projectionModel === 'cagr' && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Bitcoin CAGR (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={inputs.bitcoinCagr || ''}
                    onChange={e => handleInputChange('bitcoinCagr', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results & Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Result Banner */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div className="space-y-1 text-center sm:text-left flex-1">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Projected Retirement Age</span>
              <div className="flex items-baseline justify-center sm:justify-start gap-2">
                <span className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white">
                  {simulation.retirementAge ? simulation.retirementAge : 'N/A'}
                </span>
                {simulation.retirementAge && (
                  <span className="text-sm font-bold text-emerald-500">Years Old</span>
                )}
              </div>
            </div>

            <div className="h-12 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

            <div className="space-y-1 text-center flex-1">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Retirement Stack</span>
              <div className="text-2xl lg:text-3xl font-extrabold text-amber-500">
                {simulation.retirementBTC ? (isPrivacyMode ? "•••••••• BTC" : `${simulation.retirementBTC.toFixed(8)} BTC`) : 'N/A'}
              </div>
            </div>

            <div className="h-12 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

            <div className="space-y-1 text-center sm:text-right flex-1">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Target Year</span>
              <div className="text-2xl lg:text-3xl font-bold text-slate-700 dark:text-slate-300">
                {simulation.retirementYear ? simulation.retirementYear : 'Unreachable'}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl overflow-hidden flex flex-col h-[600px]">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">
              Year-by-Year Projection
            </h3>
            
            <div className="overflow-auto flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-950/60 font-bold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3">Age (Yr/Mo)</th>
                    <th className="px-4 py-3 text-right">BTC Bought</th>
                    <th className="px-4 py-3 text-right">BTC Accumulated</th>
                    <th className="px-4 py-3 text-right">BTC Price (THB)</th>
                    <th className="px-4 py-3 text-right">Portfolio (THB)</th>
                    <th className="px-4 py-3 text-right">Net Withdrawal (THB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  <tr className="bg-slate-50/50 dark:bg-slate-900/30 text-slate-500">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-bold">Starting Balance</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">—</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-amber-500">
                      {isPrivacyMode ? "••••••••" : (inputs.currentSavingsBTC || 0).toFixed(8)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      ฿{Math.round(livePrice).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                      {isPrivacyMode ? "฿••••••••" : `฿${Math.round((inputs.currentSavingsBTC || 0) * livePrice).toLocaleString()}`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">—</td>
                  </tr>
                  {simulation.rows.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className={`hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors ${row.isRetired ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''} ${row.year === simulation.retirementYear && row.month === simulation.retirementMonth ? 'border-l-4 border-l-emerald-500' : ''}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${row.isRetired ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                            {row.age}
                          </span>
                          <span className="text-slate-400 text-[10px]">({row.year} - {new Date(0, row.month - 1).toLocaleString('default', { month: 'short' })})</span>
                          {row.year === simulation.retirementYear && row.month === simulation.retirementMonth && (
                            <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ml-1">Retire</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-emerald-500 dark:text-emerald-400">
                        {row.isRetired ? "—" : (isPrivacyMode ? "••••••••" : `+${row.btcBought.toFixed(8)}`)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-amber-500">
                        {isPrivacyMode ? "••••••••" : row.btcAmount.toFixed(8)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                        ฿{Math.round(row.btcPriceTHB).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {isPrivacyMode ? "฿••••••••" : `฿${Math.round(row.portfolioValueTHB).toLocaleString()}`}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-rose-500 dark:text-rose-400">
                        {row.isRetired ? (
                           row.netWithdrawalTHB > 0 ? `-฿${Math.round(row.netWithdrawalTHB).toLocaleString()}/mo` : `฿0 (Covered by Pension)`
                        ) : (
                          <span className="text-emerald-500 dark:text-emerald-400">+฿{Math.round(row.monthlyBuyTHB).toLocaleString()} in</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
