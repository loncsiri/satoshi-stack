import React, { useMemo } from 'react';
import type { Transaction } from '../types';
import { Calendar, ArrowUpRight, ArrowDownRight, Wallet, Coins, Landmark } from 'lucide-react';

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

export const YearlySummary: React.FC<YearSummaryProps> = ({ transactions, livePrice, isPrivacyMode = false }) => {
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
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-xl space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Landmark className="h-5 w-5 text-amber-500" />
          Yearly Performance Summary
        </h2>
        <p className="text-xs text-slate-400">
          Historical overview of Bitcoin accumulated and invested fiat capital by calendar year evaluated at current price
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {yearlyStats.map(stat => {
          const isProfit = stat.pnl >= 0;
          return (
            <div
              key={stat.year}
              className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4 hover:border-slate-700 transition-all duration-200"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  Year {stat.year}
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-md">
                  {stat.buyCount} buys
                </span>
              </div>

              {/* Stats Rows */}
              <div className="space-y-2.5 text-xs">
                {/* Total BTC */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-slate-500" />
                    Total Accumulated:
                  </span>
                  <span className="font-bold text-amber-400">
                    {isPrivacyMode ? "•••••••• BTC" : `${stat.totalBTC.toFixed(8)} BTC`}
                  </span>
                </div>

                {/* Total Cost Basis */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5 text-slate-500" />
                    Capital Invested:
                  </span>
                  <span className="font-semibold text-slate-350">
                    {isPrivacyMode ? "฿•••• THB" : `฿${Math.round(stat.totalCost).toLocaleString()} THB`}
                  </span>
                </div>

                {/* Current Value */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Landmark className="h-3.5 w-3.5 text-slate-500" />
                    Market Value Today:
                  </span>
                  <span className="font-bold text-white">
                    {isPrivacyMode ? "฿•••• THB" : `฿${Math.round(stat.currentValue).toLocaleString()} THB`}
                  </span>
                </div>
              </div>

              {/* PNL / ROI Display */}
              <div className={`flex items-center justify-between rounded-lg p-2.5 text-xs font-bold border ${
                isPrivacyMode 
                  ? 'bg-slate-900 border-slate-800 text-slate-400'
                  : (isProfit 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400')
              }`}>
                <span>Profit / Loss:</span>
                <span className="flex items-center gap-0.5">
                  {!isPrivacyMode && (isProfit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />)}
                  {isPrivacyMode ? "฿•••• (•••%)" : `฿${Math.round(stat.pnl).toLocaleString()} (${stat.roi.toFixed(2)}%)`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Handle type interface name mapping discrepancy if any
type YearSummaryProps = YearlySummaryProps;
