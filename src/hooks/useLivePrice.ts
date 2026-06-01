import { useState, useEffect, useCallback } from 'react';

interface PriceState {
  price: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  source: string | null;
}

export function useLivePrice(autoRefreshIntervalMs: number = 60000) {
  const [state, setState] = useState<PriceState>({
    price: 4900000, // Reasonable default for mid-2026 if all fetches fail
    loading: true,
    error: null,
    lastUpdated: null,
    source: null,
  });

  const fetchPrice = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    // Helper: try Binance
    const fetchBinance = async (): Promise<{ price: number; source: string }> => {
      const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCTHB');
      if (!res.ok) throw new Error('Binance failed');
      const data = await res.json();
      const price = parseFloat(data.price);
      if (isNaN(price) || price <= 0) throw new Error('Invalid price from Binance');
      return { price, source: 'Binance API' };
    };

    // Helper: try CoinGecko
    const fetchCoinGecko = async (): Promise<{ price: number; source: string }> => {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=thb');
      if (!res.ok) throw new Error('CoinGecko failed');
      const data = await res.json();
      const price = data.bitcoin?.thb;
      if (!price || isNaN(price) || price <= 0) throw new Error('Invalid price from CoinGecko');
      return { price, source: 'CoinGecko API' };
    };

    // Helper: try CoinDesk
    const fetchCoinDesk = async (): Promise<{ price: number; source: string }> => {
      const res = await fetch('https://api.coindesk.com/v1/bpi/currentprice/THB.json');
      if (!res.ok) throw new Error('CoinDesk failed');
      const data = await res.json();
      const price = parseFloat(data.bpi.THB.rate_float);
      if (isNaN(price) || price <= 0) throw new Error('Invalid price from CoinDesk');
      return { price, source: 'CoinDesk API' };
    };

    // Try APIs in sequence (fallback mechanism)
    try {
      // 1. Try Binance (Fastest, high rate limit)
      try {
        const result = await fetchBinance();
        setState({
          price: result.price,
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
          price: result.price,
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
          price: result.price,
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
