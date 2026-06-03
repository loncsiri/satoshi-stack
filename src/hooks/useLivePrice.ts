import { useState, useEffect, useCallback } from 'react';

interface PriceState {
  priceTHB: number;
  priceUSD: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  source: string | null;
}

export function useLivePrice(autoRefreshIntervalMs: number = 60000) {
  const [state, setState] = useState<PriceState>({
    priceTHB: 4900000, // Reasonable default for mid-2026 if all fetches fail
    priceUSD: 140000,  // Approx 35 THB/USD
    loading: true,
    error: null,
    lastUpdated: null,
    source: null,
  });

  const fetchPrice = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    // Helper: try Binance
    const fetchBinance = async (): Promise<{ priceTHB: number; priceUSD: number; source: string }> => {
      const [resTHB, resUSD] = await Promise.all([
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCTHB'),
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
      ]);
      if (!resTHB.ok || !resUSD.ok) throw new Error('Binance failed');
      const dataTHB = await resTHB.json();
      const dataUSD = await resUSD.json();
      const priceTHB = parseFloat(dataTHB.price);
      const priceUSD = parseFloat(dataUSD.price);
      if (isNaN(priceTHB) || priceTHB <= 0 || isNaN(priceUSD) || priceUSD <= 0) throw new Error('Invalid price from Binance');
      return { priceTHB, priceUSD, source: 'Binance API' };
    };

    // Helper: try CoinGecko
    const fetchCoinGecko = async (): Promise<{ priceTHB: number; priceUSD: number; source: string }> => {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=thb,usd');
      if (!res.ok) throw new Error('CoinGecko failed');
      const data = await res.json();
      const priceTHB = data.bitcoin?.thb;
      const priceUSD = data.bitcoin?.usd;
      if (!priceTHB || !priceUSD || isNaN(priceTHB) || isNaN(priceUSD)) throw new Error('Invalid price from CoinGecko');
      return { priceTHB, priceUSD, source: 'CoinGecko API' };
    };

    // Helper: try CoinDesk
    const fetchCoinDesk = async (): Promise<{ priceTHB: number; priceUSD: number; source: string }> => {
      const res = await fetch('https://api.coindesk.com/v1/bpi/currentprice/THB.json');
      if (!res.ok) throw new Error('CoinDesk failed');
      const data = await res.json();
      const priceTHB = parseFloat(data.bpi.THB.rate_float);
      const priceUSD = parseFloat(data.bpi.USD.rate_float);
      if (isNaN(priceTHB) || priceTHB <= 0 || isNaN(priceUSD) || priceUSD <= 0) throw new Error('Invalid price from CoinDesk');
      return { priceTHB, priceUSD, source: 'CoinDesk API' };
    };

    // Try APIs in sequence (fallback mechanism)
    try {
      // 1. Try Binance (Fastest, high rate limit)
      try {
        const result = await fetchBinance();
        setState({
          priceTHB: result.priceTHB,
          priceUSD: result.priceUSD,
          loading: false,
          error: null,
          lastUpdated: new Date(),
          source: result.source,
        });
        return;
      } catch (e) {
        console.warn('Binance fetch failed, trying CoinGecko...', e);
      }

      // 2. Try CoinGecko
      try {
        const result = await fetchCoinGecko();
        setState({
          priceTHB: result.priceTHB,
          priceUSD: result.priceUSD,
          loading: false,
          error: null,
          lastUpdated: new Date(),
          source: result.source,
        });
        return;
      } catch (e) {
        console.warn('CoinGecko fetch failed, trying CoinDesk...', e);
      }

      // 3. Try CoinDesk
      try {
        const result = await fetchCoinDesk();
        setState({
          priceTHB: result.priceTHB,
          priceUSD: result.priceUSD,
          loading: false,
          error: null,
          lastUpdated: new Date(),
          source: result.source,
        });
        return;
      } catch (e) {
        console.warn('CoinDesk fetch failed, using fallback static price', e);
      }

      // If all APIs fail, use static fallback but set error state
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch live price. Using fallback price.',
        lastUpdated: new Date(),
        source: 'Fallback System',
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Unknown error fetching price',
        lastUpdated: new Date(),
        source: 'Fallback System',
      }));
    }
  }, []);

  useEffect(() => {
    fetchPrice();

    if (autoRefreshIntervalMs <= 0) return;

    const interval = setInterval(fetchPrice, autoRefreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchPrice, autoRefreshIntervalMs]);

  return { ...state, refresh: fetchPrice };
}
