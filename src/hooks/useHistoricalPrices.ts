import { useState, useEffect } from 'react';

export interface HistoricalPriceData {
  [date: string]: {
    thb: number;
    usd: number;
  };
}

interface HistoricalState {
  data: HistoricalPriceData;
  loading: boolean;
  error: string | null;
}

const CACHE_KEY = 'btc_tracker_historical_prices_v1';
const CACHE_TIME_KEY = 'btc_tracker_historical_prices_time_v1';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useHistoricalPrices() {
  const [state, setState] = useState<HistoricalState>({
    data: {},
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchHistoricalData() {
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
        const now = Date.now();

        if (cachedData && cachedTime && now - parseInt(cachedTime, 10) < CACHE_DURATION_MS) {
          const parsed = JSON.parse(cachedData);
          if (Object.keys(parsed).length > 0) {
            setState({
              data: parsed,
              loading: false,
              error: null,
            });
            return;
          }
        }

        // Fetch sequentially to avoid CoinGecko rate limits (429)
        let combinedData: HistoricalPriceData = {};
        
        try {
          const resTHB = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=thb&days=max&interval=daily');
          if (!resTHB.ok) throw new Error('CoinGecko THB failed');
          const dataTHB = await resTHB.json();
          
          // Process THB prices
          dataTHB.prices.forEach(([timestamp, price]: [number, number]) => {
            const date = new Date(timestamp).toISOString().split('T')[0];
            if (!combinedData[date]) combinedData[date] = { thb: 0, usd: price / 35 }; // fallback usd
            combinedData[date].thb = price;
          });

          // Wait 500ms to avoid rate limit before fetching USD
          await new Promise(r => setTimeout(r, 500));

          const resUSD = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=max&interval=daily');
          if (resUSD.ok) {
            const dataUSD = await resUSD.json();
            dataUSD.prices.forEach(([timestamp, price]: [number, number]) => {
              const date = new Date(timestamp).toISOString().split('T')[0];
              if (!combinedData[date]) combinedData[date] = { thb: price * 35, usd: 0 };
              combinedData[date].usd = price;
            });
          }
        } catch (cgError) {
          console.warn('CoinGecko failed, falling back to Binance 1000d klines', cgError);
          // Fallback to Binance (1000 days ~ 2.7 years)
          const binanceRes = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1000');
          if (!binanceRes.ok) throw new Error('Binance fallback failed');
          
          const binanceData = await binanceRes.json();
          const exchangeRate = 35; // approximate THB/USD
          
          binanceData.forEach((kline: any[]) => {
            const timestamp = kline[0];
            const closePrice = parseFloat(kline[4]);
            const date = new Date(timestamp).toISOString().split('T')[0];
            combinedData[date] = { thb: closePrice * exchangeRate, usd: closePrice };
          });
        }

        if (Object.keys(combinedData).length === 0) {
          throw new Error('All historical data APIs failed');
        }

        localStorage.setItem(CACHE_KEY, JSON.stringify(combinedData));
        localStorage.setItem(CACHE_TIME_KEY, now.toString());

        setState({
          data: combinedData,
          loading: false,
          error: null,
        });

      } catch (err: any) {
        console.error('Historical price fetch error:', err);
        
        // If we fail but have cache, use expired cache
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          setState({
            data: JSON.parse(cachedData),
            loading: false,
            error: 'Failed to update historical prices. Using cached data.',
          });
        } else {
          setState({
            data: {},
            loading: false,
            error: err.message || 'Failed to fetch historical prices',
          });
        }
      }
    }

    fetchHistoricalData();
  }, []);

  return state;
}
