import React, { useState, useEffect } from 'react';
import { Server, Zap, TrendingUp, Activity, AlertCircle } from 'lucide-react';

interface MempoolFees {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

interface HashrateData {
  timestamp: number;
  currentHashrate: number;
  currentDifficulty: number;
}

export const MempoolWidget: React.FC = () => {
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [fees, setFees] = useState<MempoolFees | null>(null);
  const [hashrates, setHashrates] = useState<HashrateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch block height
        const heightRes = await fetch('https://mempool.space/api/blocks/tip/height');
        if (!heightRes.ok) throw new Error('Failed to fetch block height');
        const heightStr = await heightRes.text();
        const height = parseInt(heightStr, 10);
        
        // Fetch fees
        const feesRes = await fetch('https://mempool.space/api/v1/fees/recommended');
        if (!feesRes.ok) throw new Error('Failed to fetch fees');
        const feesData = await feesRes.json();

        // Fetch hashrate
        const hrRes = await fetch('https://mempool.space/api/v1/mining/hashrate/3m');
        if (!hrRes.ok) throw new Error('Failed to fetch hashrate');
        const hrData = await hrRes.json();

        if (active) {
          setBlockHeight(height);
          setFees(feesData);
          setHashrates(hrData);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Mempool API Error:', err);
        if (active) {
          setError('Network stats currently unavailable');
          setLoading(false);
        }
      }
    };

    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-5 backdrop-blur-xl h-full flex flex-col items-center justify-center text-center">
        <AlertCircle className="h-6 w-6 text-slate-500 mb-2" />
        <p className="text-sm font-semibold text-slate-400">{error}</p>
      </div>
    );
  }

  // Calculate Halving
  const HALVING_INTERVAL = 210000;
  let nextHalvingBlock = 0;
  let blocksToHalving = 0;
  let estimatedDaysToHalving = 0;
  
  if (blockHeight) {
    const currentEpoch = Math.floor(blockHeight / HALVING_INTERVAL);
    nextHalvingBlock = (currentEpoch + 1) * HALVING_INTERVAL;
    blocksToHalving = nextHalvingBlock - blockHeight;
    estimatedDaysToHalving = (blocksToHalving * 10) / (60 * 24); // 10 mins per block
  }

  // Find Min/Max for Hashrate sparkline
  const validHashrates = hashrates.filter(h => h.currentHashrate > 0);
  const minHashrate = Math.min(...validHashrates.map(h => h.currentHashrate));
  const maxHashrate = Math.max(...validHashrates.map(h => h.currentHashrate));
  
  const currentHashrateEH = validHashrates.length > 0 ? validHashrates[validHashrates.length - 1].currentHashrate / 1e18 : 0;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 p-5 backdrop-blur-xl h-full flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-4">
        <Server className="h-5 w-5 text-indigo-500" />
        <h3 className="font-bold text-slate-900 dark:text-white">Bitcoin Network</h3>
      </div>

      {loading && !blockHeight ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Top Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Block Height */}
            <div className="rounded-xl bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                <Server className="h-3.5 w-3.5 text-blue-500" /> Height
              </div>
              <div className="mt-1 font-bold text-slate-900 dark:text-white text-lg">
                {blockHeight?.toLocaleString() || '---'}
              </div>
            </div>

            {/* Next Halving */}
            <div className="rounded-xl bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                <TrendingUp className="h-3.5 w-3.5 text-amber-500" /> Next Halving
              </div>
              <div className="mt-1 font-bold text-slate-900 dark:text-white text-lg">
                ~{Math.round(estimatedDaysToHalving)} <span className="text-xs text-slate-500 font-medium">days</span>
              </div>
            </div>
          </div>

          {/* Fees Grid */}
          <div className="rounded-xl bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase mb-2">
              <Zap className="h-3.5 w-3.5 text-rose-500" /> Base Fees (sat/vB)
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800">
              <div className="text-center px-1">
                <div className="text-[10px] text-slate-500 font-medium">Fast</div>
                <div className="font-bold text-rose-500">{fees?.fastestFee || '-'}</div>
              </div>
              <div className="text-center px-1">
                <div className="text-[10px] text-slate-500 font-medium">Med</div>
                <div className="font-bold text-amber-500">{fees?.halfHourFee || '-'}</div>
              </div>
              <div className="text-center px-1">
                <div className="text-[10px] text-slate-500 font-medium">Slow</div>
                <div className="font-bold text-emerald-500">{fees?.hourFee || '-'}</div>
              </div>
            </div>
          </div>

          {/* Hashrate Graph */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                <Activity className="h-3.5 w-3.5 text-indigo-500" /> Hashrate (3M)
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {currentHashrateEH.toFixed(0)} EH/s
              </div>
            </div>
            
            {/* Sparkline Canvas */}
            <div className="h-12 w-full flex items-end gap-[1px]">
              {validHashrates.map((h) => {
                const heightPercent = ((h.currentHashrate - minHashrate) / (maxHashrate - minHashrate)) * 100;
                return (
                  <div
                    key={h.timestamp}
                    className="flex-1 bg-indigo-500/30 hover:bg-indigo-500 rounded-t-sm transition-colors"
                    style={{ height: `${Math.max(5, heightPercent)}%` }}
                    title={`${new Date(h.timestamp * 1000).toLocaleDateString()}: ${(h.currentHashrate / 1e18).toFixed(1)} EH/s`}
                  />
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
