import React, { useMemo } from 'react';
import { Building2, HardDrive, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import type { Transaction, Transfer } from '../types';

interface VaultDistributionWidgetProps {
  transactions: Transaction[];
  transfers: Transfer[];
  isPrivacyMode: boolean;
  coldStorageThresholdPercent?: number;
}

const isColdVault = (loc: string): boolean => {
  const lower = loc.toLowerCase();
  return (
    lower.includes('trezor') ||
    lower.includes('ledger') ||
    lower.includes('cold') ||
    lower.includes('bitbox') ||
    lower.includes('jade') ||
    lower.includes('keystone') ||
    lower.includes('passport') ||
    lower.includes('seedsigner') ||
    lower.includes('multisig') ||
    lower.includes('vault') ||
    lower.includes('sparrow')
  );
};

export const VaultDistributionWidget: React.FC<VaultDistributionWidgetProps> = ({
  transactions,
  transfers,
  isPrivacyMode,
  coldStorageThresholdPercent = 20,
}) => {
  const { t } = useLanguage();
  const { formatBTC } = useCurrency();

  const balances = useMemo(() => {
    const map: Record<string, number> = {};

    transactions.forEach(tx => {
      const loc = tx.location || 'Exchange';
      map[loc] = (map[loc] || 0) + tx.amount;
    });

    transfers.forEach(tf => {
      map[tf.fromLocation] = (map[tf.fromLocation] || 0) - tf.amount;
      const received = Math.max(0, tf.amount - (tf.fee || 0));
      map[tf.toLocation] = (map[tf.toLocation] || 0) + received;
    });

    return Object.entries(map)
      .filter(([, amount]) => amount > 0.00000001)
      .sort((a, b) => b[1] - a[1]);
  }, [transactions, transfers]);

  const totalBTC = balances.reduce((sum, [, amt]) => sum + amt, 0);

  const custodyStats = useMemo(() => {
    if (totalBTC <= 0) return { coldPercent: 0, hotPercent: 0 };
    let coldBTC = 0;
    for (const [loc, amt] of balances) {
      if (isColdVault(loc)) {
        coldBTC += amt;
      }
    }
    const coldPercent = (coldBTC / totalBTC) * 100;
    const hotPercent = 100 - coldPercent;
    return { coldPercent, hotPercent };
  }, [balances, totalBTC]);

  const colors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-cyan-500',
  ];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-5 backdrop-blur-xl flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-5 w-5 text-indigo-500" />
        <h3 className="font-bold text-slate-900 dark:text-white">{t('app.vault.title')}</h3>
      </div>

      {balances.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-500 py-8">
          {t('app.common.noData')}
        </div>
      ) : (
        <div className="space-y-5 flex-1 flex flex-col justify-start pt-1">
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
              const isCold = isColdVault(loc);

              return (
                <div key={loc} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${colors[idx % colors.length]}`} />
                    <div className="flex items-center gap-1.5">
                      {isCold ? (
                        <HardDrive className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Building2 className="h-3.5 w-3.5 text-slate-500" />
                      )}
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {loc}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {isPrivacyMode ? '••••••••' : formatBTC(amt, { showUnit: false })}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">{percent.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Self-Custody Advisor */}
          {custodyStats.hotPercent > coldStorageThresholdPercent ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 font-medium">
              <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                {t('custody.warning').replace('{percent}', custodyStats.hotPercent.toFixed(0))}
              </span>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                {t('custody.healthy').replace('{percent}', custodyStats.coldPercent.toFixed(0))}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
