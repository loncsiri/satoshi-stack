import React, { useState, useMemo } from 'react';
import {
  calculateRetirementSimulation,
  getCurrentPowerLawStatus,
} from '../utils/retirementUtils';
import type { RetirementInputs, ProjectionModel } from '../types';
import { Target, Database, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLanguage } from '../contexts/LanguageContext';

interface RetirementPlannerProps {
  currentBTC: number;
  livePrice: number;
  monthlyBudgetTHB: number;
  isPrivacyMode: boolean;
}

interface RetireChartPoint {
  label: string;
  age: number;
  btcAmount: number;
  portfolioValueDisplay: number;
  isRetired: boolean;
}

interface RetireTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RetireChartPoint }>;
  isPrivacyMode: boolean;
  currency: 'THB' | 'USD';
  formatBTC: (val: number) => string;
}

const RetireTooltipContent: React.FC<RetireTooltipProps> = ({
  active,
  payload,
  isPrivacyMode,
  currency,
  formatBTC,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload;
  const sym = currency === 'THB' ? '฿' : '$';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 p-3.5 shadow-xl text-xs space-y-1">
      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <span>
          Age {pt.age} ({pt.label})
        </span>
        {pt.isRetired && (
          <span className="rounded bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 text-[10px]">
            Retired
          </span>
        )}
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">BTC Balance:</span>
        <span className="font-bold text-amber-500">
          {isPrivacyMode ? '••••••••' : formatBTC(pt.btcAmount)}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Portfolio Value:</span>
        <span className="font-bold text-emerald-500">
          {isPrivacyMode
            ? `${sym}••••`
            : `${sym}${Math.round(pt.portfolioValueDisplay).toLocaleString()}`}
        </span>
      </div>
    </div>
  );
};

export const RetirementPlanner: React.FC<RetirementPlannerProps> = ({
  currentBTC,
  livePrice,
  monthlyBudgetTHB,
  isPrivacyMode,
}) => {
  const { t } = useLanguage();
  const { currency, exchangeRate, formatFiat, formatBTC, unit } = useCurrency();
  const [inputs, setInputs] = useState<RetirementInputs>(() => {
    const saved = localStorage.getItem('btc_tracker_retirement_inputs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<RetirementInputs> & { currentAge?: number };
        if (parsed.pensionIncomeTHB === undefined) parsed.pensionIncomeTHB = 0;
        if (parsed.birthMonth === undefined) parsed.birthMonth = 1;
        if (parsed.birthYear === undefined) {
          parsed.birthYear = new Date().getFullYear() - (parsed.currentAge || 30);
        }
        return parsed as RetirementInputs;
      } catch {
        // Fallback to defaults below
      }
    }
    return {
      birthMonth: 1,
      birthYear: new Date().getFullYear() - 30,
      lifeExpectancy: 90,
      currentSavingsBTC: Number(currentBTC.toFixed(8)),
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
      [field]: isNaN(parsed) ? 0 : parsed,
    });
  };

  const handleModelChange = (model: ProjectionModel) => {
    updateInputs({ ...inputs, projectionModel: model });
  };

  const simulation = useMemo(() => {
    return calculateRetirementSimulation(inputs, livePrice, exchangeRate);
  }, [inputs, livePrice, exchangeRate]);

  const powerLawStatus = useMemo(
    () => getCurrentPowerLawStatus(livePrice, exchangeRate),
    [livePrice, exchangeRate]
  );

  const chartData: RetireChartPoint[] = useMemo(() => {
    const rows = simulation.rows;
    if (rows.length === 0) return [];
    // Sample every 6 or 12 months plus retirement transition point
    const step = rows.length > 120 ? 12 : rows.length > 48 ? 6 : 1;
    const sampled = rows.filter(
      (r, idx) =>
        idx === 0 ||
        idx === rows.length - 1 ||
        idx % step === 0 ||
        (r.year === simulation.retirementYear && r.month === simulation.retirementMonth)
    );
    return sampled.map(r => ({
      label: `${r.year}-${String(r.month).padStart(2, '0')}`,
      age: r.age,
      btcAmount: Number(r.btcAmount.toFixed(8)),
      portfolioValueDisplay:
        currency === 'USD' ? r.portfolioValueTHB / exchangeRate : r.portfolioValueTHB,
      isRetired: r.isRetired,
    }));
  }, [simulation.rows, simulation.retirementYear, simulation.retirementMonth, currency, exchangeRate]);

  const retirementLabel =
    simulation.retirementYear && simulation.retirementMonth
      ? `${simulation.retirementYear}-${String(simulation.retirementMonth).padStart(2, '0')}`
      : null;

  const handleFiatInputChange = (field: keyof RetirementInputs, value: string) => {
    const parsed = parseFloat(value);
    const fiatTHB = isNaN(parsed)
      ? 0
      : currency === 'THB'
      ? parsed
      : parsed * exchangeRate;
    handleInputChange(field, fiatTHB.toString());
  };

  const getDisplayFiat = (thbValue: number | undefined) => {
    if (thbValue === undefined) return '';
    return currency === 'THB'
      ? thbValue
      : thbValue
      ? Math.round(thbValue / exchangeRate)
      : 0;
  };

  const maskedFiat = currency === 'THB' ? '฿••••••••' : '$••••••••';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-6 w-6 text-purple-500" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('retire.title')}</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 min-w-0">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-6 min-w-0">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
              {t('retire.params')}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="birth-month-input"
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                  >
                    {t('retire.birth_month')}
                  </label>
                  <input
                    id="birth-month-input"
                    type="number"
                    min="1"
                    max="12"
                    value={inputs.birthMonth || ''}
                    onChange={e => handleInputChange('birthMonth', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {t('retire.birth_year')}
                  </label>
                  <input
                    type="number"
                    value={inputs.birthYear || ''}
                    onChange={e => handleInputChange('birthYear', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {t('retire.life_expectancy')}
                  </label>
                  <input
                    type="number"
                    value={inputs.lifeExpectancy || ''}
                    onChange={e => handleInputChange('lifeExpectancy', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="current-savings-input"
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                  >
                    {t('retire.current_savings')}
                  </label>
                  <button
                    onClick={() => handleInputChange('currentSavingsBTC', currentBTC.toFixed(8))}
                    className="text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded transition-colors"
                    title="Sync from Total Accumulated BTC"
                  >
                    Sync Data
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="current-savings-input"
                    type="number"
                    step="0.00000001"
                    disabled={isPrivacyMode}
                    value={isPrivacyMode ? '' : inputs.currentSavingsBTC ?? ''}
                    onChange={e => handleInputChange('currentSavingsBTC', e.target.value)}
                    placeholder={isPrivacyMode ? '••••••••' : ''}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs font-bold text-amber-500">BTC</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="monthly-buy-input"
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  {t('retire.monthly_buy')} ({currency})
                </label>
                <div className="relative">
                  <input
                    id="monthly-buy-input"
                    type="number"
                    disabled={isPrivacyMode}
                    value={isPrivacyMode ? '' : getDisplayFiat(inputs.monthlyBuyTHB)}
                    onChange={e => handleFiatInputChange('monthlyBuyTHB', e.target.value)}
                    placeholder={isPrivacyMode ? '••••' : ''}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs font-bold text-slate-400">{currency}/mo</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t('retire.savings_increase')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.savingsIncreaseRate || ''}
                    onChange={e => handleInputChange('savingsIncreaseRate', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">
                      %/yr
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="desired-income-input"
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  {t('retire.desired_income')} ({currency}/mo)
                </label>
                <div className="relative">
                  <input
                    id="desired-income-input"
                    type="number"
                    value={getDisplayFiat(inputs.desiredRetirementIncomeTHB)}
                    onChange={e => handleFiatInputChange('desiredRetirementIncomeTHB', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">
                      {currency}/mo
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="pension-input"
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  {t('retire.pension_income')} ({currency}/mo)
                </label>
                <div className="relative">
                  <input
                    id="pension-input"
                    type="number"
                    value={getDisplayFiat(inputs.pensionIncomeTHB)}
                    onChange={e => handleFiatInputChange('pensionIncomeTHB', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs font-bold text-blue-500 dark:text-blue-400">
                      {currency}/mo
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="inflation-input"
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  {t('retire.inflation_rate')}
                </label>
                <input
                  id="inflation-input"
                  type="number"
                  step="0.1"
                  value={inputs.inflationRate || ''}
                  onChange={e => handleInputChange('inflationRate', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t('retire.projection_model')}
                </label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => handleModelChange('power_law')}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                      inputs.projectionModel.startsWith('power_law')
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

                {inputs.projectionModel.startsWith('power_law') && (
                  <>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleModelChange('power_law_bear')}
                        className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition-all ${
                          inputs.projectionModel === 'power_law_bear'
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-2 border-rose-500/50'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        Bear (Support)
                      </button>
                      <button
                        onClick={() => handleModelChange('power_law')}
                        className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition-all ${
                          inputs.projectionModel === 'power_law'
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-2 border-amber-500/50'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        Avg (Fair)
                      </button>
                      <button
                        onClick={() => handleModelChange('power_law_bull')}
                        className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition-all ${
                          inputs.projectionModel === 'power_law_bull'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-500/50'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        Bull (Peak)
                      </button>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 text-[11px] space-y-1.5 mt-2">
                      <div className="font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <span>{t('powerlaw.status')}</span>
                        <span className="text-amber-500">
                          {(powerLawStatus.ratioToFair * 100).toFixed(0)}% of Fair
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                        <div className="rounded bg-rose-500/10 p-1">
                          <div className="text-[9px] text-rose-500 font-semibold">
                            {t('powerlaw.bear')}
                          </div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {formatFiat(powerLawStatus.bearTHB)}
                          </div>
                        </div>
                        <div className="rounded bg-amber-500/10 p-1">
                          <div className="text-[9px] text-amber-500 font-semibold">
                            {t('powerlaw.fair')}
                          </div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {formatFiat(powerLawStatus.fairTHB)}
                          </div>
                        </div>
                        <div className="rounded bg-emerald-500/10 p-1">
                          <div className="text-[9px] text-emerald-500 font-semibold">
                            {t('powerlaw.bull')}
                          </div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {formatFiat(powerLawStatus.bullTHB)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {inputs.projectionModel === 'cagr' && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {t('retire.cagr')}
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={inputs.bitcoinCagr || ''}
                    onChange={e => handleInputChange('bitcoinCagr', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results, Chart & Table */}
        <div className="lg:col-span-2 space-y-6 min-w-0 flex flex-col">
          {/* Top Result Banner */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div className="space-y-1 text-center sm:text-left flex-1">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {t('retire.projected_age')}
              </span>
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
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {t('retire.retirement_stack')}
              </span>
              <div className="text-2xl lg:text-3xl font-extrabold text-amber-500">
                {simulation.retirementBTC !== null
                  ? isPrivacyMode
                    ? '••••••••'
                    : formatBTC(simulation.retirementBTC)
                  : 'N/A'}
              </div>
            </div>

            <div className="h-12 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

            <div className="space-y-1 text-center sm:text-right flex-1">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {t('retire.target_year')}
              </span>
              <div className="text-2xl lg:text-3xl font-bold text-slate-700 dark:text-slate-300">
                {simulation.retirementYear ? simulation.retirementYear : t('retire.unreachable')}
              </div>
            </div>
          </div>

          {/* Trajectory Chart */}
          {chartData.length > 1 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-purple-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {t('retire.chart.title')}
                </h3>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="retireBtcGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} vertical={false} />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#f59e0b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val: number) => {
                        if (isPrivacyMode) return '•••';
                        if (unit === 'SATS') {
                          return `${Math.round((val * 100_000_000) / 1_000_000)}M`;
                        }
                        return val.toFixed(2);
                      }}
                    />
                    <Tooltip
                      content={
                        <RetireTooltipContent
                          isPrivacyMode={isPrivacyMode}
                          currency={currency}
                          formatBTC={formatBTC}
                        />
                      }
                    />
                    {retirementLabel && (
                      <ReferenceLine
                        x={retirementLabel}
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        label={{
                          value: `Retire (${simulation.retirementAge}y)`,
                          fill: '#10b981',
                          fontSize: 11,
                          position: 'insideTopRight',
                        }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="btcAmount"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#retireBtcGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl overflow-hidden flex flex-col h-[560px] min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Database className="h-4.5 w-4.5 text-blue-500" />
              {t('retire.path_data')}
            </h3>

            <div className="overflow-auto flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 w-full">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-950/60 font-bold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3">{t('retire.table.age')}</th>
                    <th className="px-4 py-3 text-right">{t('retire.table.btc_bought')}</th>
                    <th className="px-4 py-3 text-right">{t('retire.table.btc_acc')}</th>
                    <th className="px-4 py-3 text-right">{t('retire.table.btc_price_thb')}</th>
                    <th className="px-4 py-3 text-right">{t('retire.table.portfolio_thb')}</th>
                    <th className="px-4 py-3 text-right">{t('retire.table.withdrawal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  <tr className="bg-slate-50/50 dark:bg-slate-900/30 text-slate-500">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-bold">{t('retire.starting_balance')}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">—</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-amber-500">
                      {isPrivacyMode ? '••••••••' : formatBTC(inputs.currentSavingsBTC || 0)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {formatFiat(livePrice)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                      {isPrivacyMode
                        ? maskedFiat
                        : formatFiat((inputs.currentSavingsBTC || 0) * livePrice)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">—</td>
                  </tr>
                  {simulation.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors ${
                        row.isRetired ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''
                      } ${
                        row.year === simulation.retirementYear &&
                        row.month === simulation.retirementMonth
                          ? 'border-l-4 border-l-emerald-500'
                          : ''
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              row.isRetired
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {row.age}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            ({row.year} -{' '}
                            {new Date(0, row.month - 1).toLocaleString('default', {
                              month: 'short',
                            })}
                            )
                          </span>
                          {row.year === simulation.retirementYear &&
                            row.month === simulation.retirementMonth && (
                              <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ml-1">
                                Retire
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-emerald-500 dark:text-emerald-400">
                        {row.isRetired
                          ? '—'
                          : isPrivacyMode
                          ? '••••••••'
                          : formatBTC(row.btcBought, { signed: true })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-amber-500">
                        {isPrivacyMode ? '••••••••' : formatBTC(row.btcAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                        {formatFiat(row.btcPriceTHB)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {isPrivacyMode ? maskedFiat : formatFiat(row.portfolioValueTHB)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-rose-500 dark:text-rose-400">
                        {row.isRetired ? (
                          row.netWithdrawalTHB > 0
                            ? `-${formatFiat(row.netWithdrawalTHB)}/mo`
                            : `${currency === 'THB' ? '฿0' : '$0'} (Covered by Pension)`
                        ) : (
                          <span className="text-emerald-500 dark:text-emerald-400">
                            +{formatFiat(row.monthlyBuyTHB)} in
                          </span>
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
