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
          const parsed = JSON.parse(cachedData) as HistoricalPriceData;
          if (Object.keys(parsed).length > 0) {
            setState({
              data: parsed,
              loading: false,
              error: null,
            });
            return;
          }
        }

        const combinedData: HistoricalPriceData = {};

        try {
          const resTHB = await fetch(
            'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=thb&days=max&interval=daily'
          );
          if (!resTHB.ok) throw new Error('CoinGecko THB failed');
          const dataTHB = (await resTHB.json()) as { prices: [number, number][] };

          dataTHB.prices.forEach(([timestamp, price]) => {
            const date = new Date(timestamp).toISOString().split('T')[0];
            if (!combinedData[date]) combinedData[date] = { thb: 0, usd: price / 35 };
            combinedData[date].thb = price;
          });

          await new Promise(r => setTimeout(r, 500));

          const resUSD = await fetch(
            'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=max&interval=daily'
          );
          if (resUSD.ok) {
            const dataUSD = (await resUSD.json()) as { prices: [number, number][] };
            dataUSD.prices.forEach(([timestamp, price]) => {
              const date = new Date(timestamp).toISOString().split('T')[0];
              if (!combinedData[date]) combinedData[date] = { thb: price * 35, usd: 0 };
              combinedData[date].usd = price;
            });
          }
        } catch (cgError) {
          console.warn('CoinGecko failed, falling back to Binance 1000d klines', cgError);
          const binanceRes = await fetch(
            'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1000'
          );
          if (!binanceRes.ok) {
            throw new Error('Binance fallback failed', { cause: cgError });
          }

          const binanceData = (await binanceRes.json()) as Array<[number, string, string, string, string]>;
          const exchangeRate = 35;

          binanceData.forEach(kline => {
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
      } catch (err: unknown) {
        console.error('Historical price fetch error:', err);

        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          setState({
            data: JSON.parse(cachedData) as HistoricalPriceData,
            loading: false,
            error: 'Failed to update historical prices. Using cached data.',
          });
        } else {
          const message = err instanceof Error ? err.message : 'Failed to fetch historical prices';
          setState({
            data: {},
            loading: false,
            error: message,
          });
        }
      }
    }

    void fetchHistoricalData();
  }, []);

  return state;
}
