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
    priceTHB: 4900000,
    priceUSD: 140000,
    loading: true,
    error: null,
    lastUpdated: null,
    source: null,
  });

  const fetchPrice = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    // 1. Binance (Fastest, high rate limit)
    const fetchBinance = async (): Promise<{ priceTHB: number; priceUSD: number; source: string }> => {
      const [resTHB, resUSD] = await Promise.all([
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCTHB'),
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'),
      ]);
      if (!resTHB.ok || !resUSD.ok) throw new Error('Binance failed');
      const dataTHB = (await resTHB.json()) as { price: string };
      const dataUSD = (await resUSD.json()) as { price: string };
      const priceTHB = parseFloat(dataTHB.price);
      const priceUSD = parseFloat(dataUSD.price);
      if (isNaN(priceTHB) || priceTHB <= 0 || isNaN(priceUSD) || priceUSD <= 0) {
        throw new Error('Invalid price from Binance');
      }
      return { priceTHB, priceUSD, source: 'Binance API' };
    };

    // 2. CoinGecko
    const fetchCoinGecko = async (): Promise<{ priceTHB: number; priceUSD: number; source: string }> => {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=thb,usd'
      );
      if (!res.ok) throw new Error('CoinGecko failed');
      const data = (await res.json()) as { bitcoin?: { thb?: number; usd?: number } };
      const priceTHB = data.bitcoin?.thb;
      const priceUSD = data.bitcoin?.usd;
      if (!priceTHB || !priceUSD || isNaN(priceTHB) || isNaN(priceUSD)) {
        throw new Error('Invalid price from CoinGecko');
      }
      return { priceTHB, priceUSD, source: 'CoinGecko API' };
    };

    // 3. Mempool.space (USD) + Bitkub (THB) fallback
    const fetchMempoolAndBitkub = async (): Promise<{
      priceTHB: number;
      priceUSD: number;
      source: string;
    }> => {
      const [mempoolRes, bitkubRes] = await Promise.allSettled([
        fetch('https://mempool.space/api/v1/prices'),
        fetch('https://api.bitkub.com/api/v3/market/ticker?sym=btc_thb'),
      ]);

      let priceUSD = 0;
      if (mempoolRes.status === 'fulfilled' && mempoolRes.value.ok) {
        const mempoolData = (await mempoolRes.value.json()) as { USD?: number };
        if (typeof mempoolData.USD === 'number' && mempoolData.USD > 0) {
          priceUSD = mempoolData.USD;
        }
      }

      let priceTHB = 0;
      if (bitkubRes.status === 'fulfilled' && bitkubRes.value.ok) {
        const bitkubData = (await bitkubRes.value.json()) as Array<{ last?: string | number }>;
        const lastVal = Array.isArray(bitkubData) ? Number(bitkubData[0]?.last) : 0;
        if (!isNaN(lastVal) && lastVal > 0) {
          priceTHB = lastVal;
        }
      }

      if (priceUSD <= 0 && priceTHB <= 0) {
        throw new Error('Mempool & Bitkub failed');
      }

      // Derive missing side using ~35 THB/USD fallback if only one provider responded
      const resolvedUSD = priceUSD > 0 ? priceUSD : priceTHB / 35;
      const resolvedTHB = priceTHB > 0 ? priceTHB : priceUSD * 35;
      const sourceLabel =
        priceUSD > 0 && priceTHB > 0
          ? 'Mempool + Bitkub'
          : priceUSD > 0
          ? 'Mempool.space API'
          : 'Bitkub API';

      return { priceTHB: resolvedTHB, priceUSD: resolvedUSD, source: sourceLabel };
    };

    try {
      const providers = [fetchBinance, fetchCoinGecko, fetchMempoolAndBitkub];

      for (const provider of providers) {
        try {
          const result = await provider();
          setState({
            priceTHB: result.priceTHB,
            priceUSD: result.priceUSD,
            loading: false,
            error: null,
            lastUpdated: new Date(),
            source: result.source,
          });
          return;
        } catch (err) {
          console.warn('Price provider failed, trying next fallback...', err);
        }
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch live price. Using fallback price.',
        lastUpdated: new Date(),
        source: 'Fallback System',
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching price';
      setState(prev => ({
        ...prev,
        loading: false,
        error: message,
        lastUpdated: new Date(),
        source: 'Fallback System',
      }));
    }
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      void fetchPrice();
    }, 0);

    if (autoRefreshIntervalMs <= 0) {
      return () => clearTimeout(initialTimer);
    }

    const interval = setInterval(() => {
      void fetchPrice();
    }, autoRefreshIntervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [fetchPrice, autoRefreshIntervalMs]);

  return { ...state, refresh: fetchPrice };
}
