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
import type { Transaction, Timeframe } from '../types';
import { filterTransactionsByTimeframe, generateChartData } from '../utils/financeUtils';
import { Calendar } from 'lucide-react';

interface PortfolioChartProps {
  transactions: Transaction[];
  livePrice: number;
  isPrivacyMode?: boolean;
}

export const PortfolioChart: React.FC<PortfolioChartProps> = ({ transactions, livePrice, isPrivacyMode = false }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('ALL');

  // Filtered transactions for the chart
  const chartData = useMemo(() => {
    // Generate full historical series first so cumulative calculations are correct
    const fullSeries = generateChartData(transactions);
    
    if (fullSeries.length === 0) return [];
    
    // reference date is the last transaction date or today
    const referenceDate = fullSeries[fullSeries.length - 1].date;
    
    // Filter the final data points by timeframe
    return filterTransactionsByTimeframe(fullSeries, timeframe, referenceDate);
  }, [transactions, timeframe]);

  // Format date for chart X-axis
  const formatXAxis = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // Custom tool-tip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(data.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const value = data.cumulativeBTC * livePrice;
      const pnl = value - data.cumulativeCost;
      const pnlPercent = data.cumulativeCost > 0 ? (pnl / data.cumulativeCost) * 100 : 0;

      return (
        <div className="rounded-xl border border-slate-800 bg-slate-950/95 p-4 shadow-xl backdrop-blur-md">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
            <Calendar className="h-3.5 w-3.5" />
            {date}
          </p>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-6">
              <span className="text-slate-400">Total Accumulation:</span>
              <span className="font-bold text-amber-400">
                {isPrivacyMode ? "•••• BTC" : `${data.cumulativeBTC.toFixed(6)} BTC`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-slate-400">Total Cost Basis:</span>
              <span className="font-bold text-slate-300">
                {isPrivacyMode ? "฿••••" : `฿${Math.round(data.cumulativeCost).toLocaleString()} THB`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-slate-400">Current Value:</span>
              <span className="font-bold text-white">
                {isPrivacyMode ? "฿••••" : `฿${Math.round(value).toLocaleString()} THB`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6 border-t border-slate-800/80 pt-1.5 mt-1.5">
              <span className="text-slate-400">Unrealized PNL:</span>
              <span className={`font-bold ${isPrivacyMode ? 'text-slate-400' : (pnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}`}>
                {isPrivacyMode ? "฿•••• (•••%)" : `฿${Math.round(pnl).toLocaleString()} (${pnlPercent.toFixed(2)}%)`}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const timeframes: Timeframe[] = ['1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'ALL'];

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white">Accumulation & Valuation Trend</h2>
          <p className="text-xs text-slate-400">
            Compare accumulated BTC weight against total cost and live market valuation over time
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex rounded-xl bg-slate-950 border border-slate-800 p-1">
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${timeframe === tf ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-[350px] items-center justify-center rounded-xl bg-slate-950/20 border border-dashed border-slate-800">
          <p className="text-sm text-slate-500">No transaction data available for this timeframe.</p>
        </div>
      ) : (
        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {/* BTC Gradient */}
                <linearGradient id="colorBTC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                {/* Cost Gradient */}
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
              
              {/* Left Y-axis for Cumulative BTC amount */}
              <YAxis
                yAxisId="left"
                stroke="#f59e0b"
                fontSize={12}
                tickFormatter={value => isPrivacyMode ? "••••" : value.toFixed(4)}
                tickLine={false}
                axisLine={false}
                width={65}
              />
              
              {/* Right Y-axis for Fiat Cost Basis */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#3b82f6"
                fontSize={12}
                tickFormatter={value => isPrivacyMode ? "••••" : `฿${(value / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
                width={50}
              />

              <Tooltip content={<CustomTooltip />} />
              
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ fontSize: 14, paddingBottom: 10 }}
              />

              {/* Area for Cumulative BTC (Left scale) */}
              <Area
                yAxisId="left"
                type="monotone"
                name="Accumulated BTC"
                dataKey="cumulativeBTC"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorBTC)"
              />

              {/* Area for Cumulative Cost Basis (Right scale) */}
              <Area
                yAxisId="right"
                type="monotone"
                name="Total Cost Basis (THB)"
                dataKey="cumulativeCost"
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorCost)"
              />

              {/* Line for Portfolio Value at purchase price (Right scale) */}
              <Area
                yAxisId="right"
                type="monotone"
                name="Portfolio Value over time (THB)"
                dataKey="portfolioValue"
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
