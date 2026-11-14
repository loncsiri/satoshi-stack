import React, { useState, useEffect } from 'react';
import { Server, Zap, TrendingUp, Activity, AlertCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface MempoolFees {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

interface HashrateItem {
  timestamp?: number;
  currentHashrate?: number;
  avgHashrate?: number;
  hashrate?: number;
  currentDifficulty?: number;
  difficulty?: number;
}

interface HashrateData {
  timestamp: number;
  currentHashrate: number;
  currentDifficulty: number;
}

export const MempoolWidget: React.FC = () => {
  const { t } = useLanguage();
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [fees, setFees] = useState<MempoolFees | null>(null);
  const [hashrates, setHashrates] = useState<HashrateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let abortController = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      abortController = new AbortController();
      const signal = abortController.signal;
      const timeoutId = setTimeout(() => abortController.abort(), 10000);

      try {
        const [heightRes, feesRes, hrRes] = await Promise.allSettled([
          fetch('https://mempool.space/api/blocks/tip/height', { signal }).then(r => {
            if (!r.ok) throw new Error('height');
            return r.text();
          }),
          fetch('https://mempool.space/api/v1/fees/recommended', { signal }).then(r => {
            if (!r.ok) throw new Error('fees');
            return r.json() as Promise<MempoolFees>;
          }),
          fetch('https://mempool.space/api/v1/mining/hashrate/3m', { signal }).then(r => {
            if (!r.ok) throw new Error('hashrate');
            return r.json() as Promise<HashrateItem[] | { hashrates?: HashrateItem[] }>;
          }),
        ]);

        clearTimeout(timeoutId);

        if (active) {
          let successCount = 0;

          if (heightRes.status === 'fulfilled' && heightRes.value) {
            const parsed = parseInt(heightRes.value, 10);
            if (!isNaN(parsed)) {
              setBlockHeight(parsed);
              successCount++;
            }
          }

          if (feesRes.status === 'fulfilled' && feesRes.value) {
            setFees(feesRes.value);
            successCount++;
          }

          if (hrRes.status === 'fulfilled' && hrRes.value) {
            const data = hrRes.value;
            const hrArray = Array.isArray(data) ? data : data?.hashrates || [];

            const mapped: HashrateData[] = hrArray.map(item => ({
              timestamp: item.timestamp || 0,
              currentHashrate: item.currentHashrate || item.avgHashrate || item.hashrate || 0,
              currentDifficulty: item.currentDifficulty || item.difficulty || 0,
            }));

            setHashrates(mapped);
            successCount++;
          }

          setLoading(false);

          if (successCount === 0) {
            setError(t('mempool.error'));
          }
        }
      } catch {
        clearTimeout(timeoutId);
        if (active) {
          setError(t('mempool.error'));
          setLoading(false);
        }
      }
    };

    void fetchData();
    const interval = setInterval(() => {
      void fetchData();
    }, 300000);
    return () => {
      active = false;
      abortController.abort();
      clearInterval(interval);
    };
  }, [t]);

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-5 backdrop-blur-xl flex flex-col items-center justify-center text-center min-h-[160px]">
        <AlertCircle className="h-6 w-6 text-slate-500 mb-2" />
        <p className="text-xs font-semibold text-slate-400">{error}</p>
      </div>
    );
  }

  const HALVING_INTERVAL = 210000;
  let estimatedDaysToHalving = 0;

  if (blockHeight) {
    const currentEpoch = Math.floor(blockHeight / HALVING_INTERVAL);
    const nextHalvingBlock = (currentEpoch + 1) * HALVING_INTERVAL;
    const blocksToHalving = nextHalvingBlock - blockHeight;
    estimatedDaysToHalving = (blocksToHalving * 10) / (60 * 24);
  }

  const validHashrates = hashrates.filter(h => h.currentHashrate > 0);
  const minHashrate = validHashrates.length > 0 ? Math.min(...validHashrates.map(h => h.currentHashrate)) : 0;
  const maxHashrate = validHashrates.length > 0 ? Math.max(...validHashrates.map(h => h.currentHashrate)) : 1;
  const hashrateRange = Math.max(1, maxHashrate - minHashrate);

  const currentHashrateEH =
    validHashrates.length > 0 ? validHashrates[validHashrates.length - 1].currentHashrate / 1e18 : 0;

  const isLowFeeWindow = fees !== null && fees.hourFee <= 5;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-5 backdrop-blur-xl flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-4">
        <Server className="h-5 w-5 text-indigo-500" />
        <h3 className="font-bold text-slate-900 dark:text-white">{t('mempool.title')}</h3>
      </div>

      {loading && !blockHeight ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                <Server className="h-3.5 w-3.5 text-blue-500" /> {t('mempool.height')}
              </div>
              <div className="mt-1 font-bold text-slate-900 dark:text-white text-lg">
                {blockHeight?.toLocaleString() || '---'}
              </div>
            </div>

            <div className="rounded-xl bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                <TrendingUp className="h-3.5 w-3.5 text-amber-500" /> {t('mempool.next_halving')}
              </div>
              <div className="mt-1 font-bold text-slate-900 dark:text-white text-lg">
                ~{Math.round(estimatedDaysToHalving)}{' '}
                <span className="text-xs text-slate-500 font-medium">{t('mempool.days')}</span>
              </div>
            </div>
          </div>

          {/* Fees Grid */}
          <div className="rounded-xl bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase mb-2">
              <Zap className="h-3.5 w-3.5 text-rose-500" /> {t('mempool.fees')}
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800">
              <div className="text-center px-1">
                <div className="text-[10px] text-slate-500 font-medium">{t('mempool.fast')}</div>
                <div className="font-bold text-rose-500">{fees?.fastestFee ?? '-'}</div>
              </div>
              <div className="text-center px-1">
                <div className="text-[10px] text-slate-500 font-medium">{t('mempool.med')}</div>
                <div className="font-bold text-amber-500">{fees?.halfHourFee ?? '-'}</div>
              </div>
              <div className="text-center px-1">
                <div className="text-[10px] text-slate-500 font-medium">{t('mempool.slow')}</div>
                <div className="font-bold text-emerald-500">{fees?.hourFee ?? '-'}</div>
              </div>
            </div>
          </div>

          {/* UTXO Consolidation Advisor */}
          {isLowFeeWindow && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{t('mempool.utxo_tip')}</span>
            </div>
          )}

          {/* Hashrate Graph */}
          {validHashrates.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                  <Activity className="h-3.5 w-3.5 text-indigo-500" /> {t('mempool.hashrate')}
                </div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {currentHashrateEH.toFixed(0)} EH/s
                </div>
              </div>

              <div className="h-12 w-full flex items-end gap-[1px]">
                {validHashrates.map(h => {
                  const heightPercent = ((h.currentHashrate - minHashrate) / hashrateRange) * 100;
                  return (
                    <div
                      key={h.timestamp}
                      className="flex-1 bg-indigo-500/30 hover:bg-indigo-500 rounded-t-sm transition-colors"
                      style={{ height: `${Math.max(5, heightPercent)}%` }}
                      title={`${new Date(h.timestamp * 1000).toLocaleDateString()}: ${(
                        h.currentHashrate / 1e18
                      ).toFixed(1)} EH/s`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
