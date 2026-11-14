import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { Transaction, Transfer, Timeframe } from '../types';
import {
  filterTransactionsByTimeframe,
  generateChartData,
  downsampleChartData,
} from '../utils/financeUtils';
import type { ChartDataPoint } from '../utils/financeUtils';
import { Calendar } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useHistoricalPrices } from '../hooks/useHistoricalPrices';

interface PortfolioChartProps {
  transactions: Transaction[];
  transfers?: Transfer[];
  livePrice: number;
  isPrivacyMode?: boolean;
}

interface DisplayChartPoint extends ChartDataPoint {
  cumulativeCostDisplay: number;
  portfolioValueDisplay: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DisplayChartPoint }>;
  isPrivacyMode: boolean;
  currency: 'THB' | 'USD';
  formatFiat: (amountInTHB: number, round?: boolean) => string;
  formatBTC: (amountInBTC: number, options?: { showUnit?: boolean; decimals?: number }) => string;
  labels: {
    accumulated: string;
    costBasis: string;
    marketValue: string;
    unrealizedPnl: string;
  };
}

const ChartTooltipContent: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  isPrivacyMode,
  currency,
  formatFiat,
  formatBTC,
  labels,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const date = new Date(data.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const value = data.portfolioValueDisplay;
  const currentCostDisplay = data.cumulativeCostDisplay;
  const pnl = value - currentCostDisplay;
  const pnlPercent = currentCostDisplay > 0 ? (pnl / currentCostDisplay) * 100 : 0;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 p-4 shadow-xl backdrop-blur-md">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
        <Calendar className="h-3.5 w-3.5" />
        {date}
      </p>
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-6">
          <span className="text-slate-600 dark:text-slate-400">{labels.accumulated}:</span>
          <span className="font-bold text-amber-500 dark:text-amber-400">
            {isPrivacyMode ? '••••' : formatBTC(data.cumulativeBTC, { decimals: 6 })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-slate-600 dark:text-slate-400">{labels.costBasis}:</span>
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {isPrivacyMode
              ? currency === 'THB'
                ? '฿••••'
                : '$••••'
              : formatFiat(data.cumulativeCost)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-slate-600 dark:text-slate-400">{labels.marketValue}:</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {isPrivacyMode
              ? currency === 'THB'
                ? '฿••••'
                : '$••••'
              : `${currency === 'THB' ? '฿' : '$'}${Math.round(value).toLocaleString()}`}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6 border-t border-slate-200 dark:border-slate-800/80 pt-1.5 mt-1.5">
          <span className="text-slate-600 dark:text-slate-400">{labels.unrealizedPnl}:</span>
          <span
            className={`font-bold ${
              isPrivacyMode
                ? 'text-slate-400'
                : pnl >= 0
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {isPrivacyMode
              ? '•••• (•••%)'
              : `${pnl >= 0 ? '+' : ''}${currency === 'THB' ? '฿' : '$'}${Math.round(
                  pnl
                ).toLocaleString()} (${pnlPercent.toFixed(2)}%)`}
          </span>
        </div>
      </div>
    </div>
  );
};

export const PortfolioChart: React.FC<PortfolioChartProps> = ({
  transactions,
  transfers = [],
  livePrice,
  isPrivacyMode = false,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const { formatFiat, formatBTC, unit, currency, exchangeRate } = useCurrency();
  const { t } = useLanguage();
  const { data: historicalData } = useHistoricalPrices();

  const chartData = useMemo(() => {
    const fullSeries = generateChartData(transactions, livePrice, historicalData, transfers);
    if (fullSeries.length === 0) return [];

    const referenceDate = fullSeries[fullSeries.length - 1].date;
    const filteredSeries = filterTransactionsByTimeframe(fullSeries, timeframe, referenceDate);
    return downsampleChartData(filteredSeries, timeframe);
  }, [transactions, transfers, timeframe, livePrice, historicalData]);

  const displayData: DisplayChartPoint[] = useMemo(() => {
    return chartData.map(d => ({
      ...d,
      cumulativeCostDisplay: currency === 'USD' ? d.cumulativeCost / exchangeRate : d.cumulativeCost,
      portfolioValueDisplay: currency === 'USD' ? d.portfolioValue / exchangeRate : d.portfolioValue,
    }));
  }, [chartData, currency, exchangeRate]);

  const formatXAxis = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const tooltipLabels = useMemo(
    () => ({
      accumulated: t('chart.tooltip.accumulated'),
      costBasis: t('chart.tooltip.cost_basis'),
      marketValue: t('chart.tooltip.market_value'),
      unrealizedPnl: t('chart.tooltip.unrealized_pnl'),
    }),
    [t]
  );

  const timeframes: Timeframe[] = ['1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'ALL'];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-6 backdrop-blur-xl min-w-0 h-full flex flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('chart.title')}</h2>
          <p className="text-xs text-slate-400">{t('chart.subtitle')}</p>
        </div>

        {/* Timeframe selector */}
        <div className="flex flex-wrap rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`rounded-lg px-2 sm:px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                timeframe === tf
                  ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex flex-1 min-h-[350px] items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500">No transaction data available for this timeframe.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-[380px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBTC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} vertical={false} />

              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                stroke="#64748b"
                fontSize={13}
                tickLine={false}
                axisLine={false}
                dy={10}
              />

              <YAxis
                yAxisId="left"
                stroke="#f59e0b"
                fontSize={12}
                tickFormatter={(value: number) => {
                  if (isPrivacyMode) return '••••';
                  if (unit === 'SATS') {
                    const sats = value * 100_000_000;
                    return sats >= 1_000_000
                      ? `${(sats / 1_000_000).toFixed(1)}M`
                      : `${Math.round(sats / 1000)}k`;
                  }
                  return value.toFixed(4);
                }}
                tickLine={false}
                axisLine={false}
                width={80}
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#3b82f6"
                fontSize={12}
                tickFormatter={(value: number) =>
                  isPrivacyMode
                    ? '••••'
                    : `${currency === 'THB' ? '฿' : '$'}${(value / 1000).toFixed(0)}k`
                }
                tickLine={false}
                axisLine={false}
                width={55}
              />

              <Tooltip
                content={
                  <ChartTooltipContent
                    isPrivacyMode={isPrivacyMode}
                    currency={currency}
                    formatFiat={formatFiat}
                    formatBTC={formatBTC}
                    labels={tooltipLabels}
                  />
                }
              />

              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ fontSize: 14, paddingBottom: 10 }}
              />

              <Area
                yAxisId="left"
                type="monotone"
                name={`${t('chart.accumulated_btc')} (${unit === 'SATS' ? 'sats' : 'BTC'})`}
                dataKey="cumulativeBTC"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorBTC)"
              />

              <Area
                yAxisId="right"
                type="monotone"
                name={`${t('chart.total_cost_basis_thb')} (${currency})`}
                dataKey="cumulativeCostDisplay"
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorCost)"
              />

              <Area
                yAxisId="right"
                type="monotone"
                name={`${t('chart.portfolio_value_thb')} (${currency})`}
                dataKey="portfolioValueDisplay"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={0}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
