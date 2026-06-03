import React, { useMemo } from 'react';
import { Landmark, Building2, HardDrive } from 'lucide-react';
import type { Transaction, Transfer } from '../types';

interface VaultDistributionWidgetProps {
  transactions: Transaction[];
  transfers: Transfer[];
  isPrivacyMode: boolean;
}

export const VaultDistributionWidget: React.FC<VaultDistributionWidgetProps> = ({
  transactions,
  transfers,
  isPrivacyMode,
}) => {
  const balances = useMemo(() => {
    const map: Record<string, number> = {};
    
    // Sum up buys
    transactions.forEach(tx => {
      const loc = tx.location || 'Exchange';
      map[loc] = (map[loc] || 0) + tx.amount;
    });

    // Apply internal transfers
    transfers.forEach(tf => {
      map[tf.fromLocation] = (map[tf.fromLocation] || 0) - tf.amount;
      map[tf.toLocation] = (map[tf.toLocation] || 0) + tf.amount;
    });

    // Filter out tiny dust or empty vaults
    return Object.entries(map)
      .filter(([_, amount]) => amount > 0.00000001)
      .sort((a, b) => b[1] - a[1]); // Largest first
  }, [transactions, transfers]);

  const totalBTC = balances.reduce((sum, [_, amt]) => sum + amt, 0);

  // Generate a distinct color array
  const colors = [
    'bg-emerald-500', 
    'bg-blue-500', 
    'bg-amber-500', 
    'bg-purple-500', 
    'bg-rose-500', 
    'bg-cyan-500'
  ];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-5 backdrop-blur-xl h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Landmark className="h-5 w-5 text-blue-500" />
        <h3 className="font-bold text-slate-900 dark:text-white">Vault Distribution</h3>
      </div>

      {balances.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
          No data yet.
        </div>
      ) : (
        <div className="space-y-5 flex-1 flex flex-col justify-center">
          {/* Progress Bar Segment */}
          <div className="h-4 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
            {balances.map(([loc, amt], idx) => {
              const percent = totalBTC > 0 ? (amt / totalBTC) * 100 : 0;
              return (
                <div 
                  key={loc}
                  style={{ width: `${percent}%` }}
                  className={`${colors[idx % colors.length]} h-full transition-all duration-500`}
                  title={`${loc}: ${percent.toFixed(1)}%`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="space-y-3">
            {balances.map(([loc, amt], idx) => {
              const percent = totalBTC > 0 ? (amt / totalBTC) * 100 : 0;
              const isCold = loc.toLowerCase().includes('trezor') || loc.toLowerCase().includes('ledger') || loc.toLowerCase().includes('cold');
              
              return (
                <div key={loc} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${colors[idx % colors.length]}`} />
                    <div className="flex items-center gap-1.5">
                      {isCold ? <HardDrive className="h-3.5 w-3.5 text-slate-500" /> : <Building2 className="h-3.5 w-3.5 text-slate-500" />}
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{loc}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {isPrivacyMode ? '••••••••' : amt.toFixed(8)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {percent.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
