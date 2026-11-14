import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';

export type Currency = 'THB' | 'USD';
export type BitcoinUnit = 'BTC' | 'SATS';

interface FormatBTCOptions {
  showUnit?: boolean;
  decimals?: number;
  signed?: boolean;
}

interface CurrencyContextProps {
  currency: Currency;
  toggleCurrency: () => void;
  unit: BitcoinUnit;
  toggleUnit: () => void;
  unitLabel: string;
  priceTHB: number;
  priceUSD: number;
  currentPrice: number;
  exchangeRate: number;
  formatFiat: (amountInTHB: number, round?: boolean) => string;
  formatBTC: (amountInBTC: number, options?: FormatBTCOptions) => string;
}

const CurrencyContext = createContext<CurrencyContextProps | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
  priceTHB: number;
  priceUSD: number;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({
  children,
  priceTHB,
  priceUSD,
}) => {
  const [currency, setCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('btc_tracker_currency');
    return saved === 'USD' || saved === 'THB' ? saved : 'THB';
  });

  const [unit, setUnit] = useState<BitcoinUnit>(() => {
    const saved = localStorage.getItem('btc_tracker_unit');
    return saved === 'SATS' || saved === 'BTC' ? saved : 'BTC';
  });

  useEffect(() => {
    localStorage.setItem('btc_tracker_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('btc_tracker_unit', unit);
  }, [unit]);

  const toggleCurrency = useCallback(() => {
    setCurrency(prev => (prev === 'THB' ? 'USD' : 'THB'));
  }, []);

  const toggleUnit = useCallback(() => {
    setUnit(prev => (prev === 'BTC' ? 'SATS' : 'BTC'));
  }, []);

  const exchangeRate = useMemo(() => {
    if (!priceTHB || !priceUSD || priceUSD === 0) return 35;
    return priceTHB / priceUSD;
  }, [priceTHB, priceUSD]);

  const currentPrice = currency === 'THB' ? priceTHB : priceUSD;

  const formatFiat = useCallback(
    (amountInTHB: number, round: boolean = true) => {
      if (currency === 'THB') {
        const val = round ? Math.round(amountInTHB) : amountInTHB;
        return `฿${val.toLocaleString()}`;
      } else {
        const amountInUSD = amountInTHB / exchangeRate;
        const val = round ? Math.round(amountInUSD) : amountInUSD;
        return `$${val.toLocaleString()}`;
      }
    },
    [currency, exchangeRate]
  );

  const formatBTC = useCallback(
    (amountInBTC: number, options: FormatBTCOptions = {}) => {
      const { showUnit = true, decimals = 8, signed = false } = options;
      const signPrefix = signed && amountInBTC > 0 ? '+' : '';

      if (unit === 'SATS') {
        const sats = Math.round(amountInBTC * 100_000_000);
        const formatted = `${signPrefix}${sats.toLocaleString()}`;
        return showUnit ? `${formatted} sats` : formatted;
      }

      const formatted = `${signPrefix}${amountInBTC.toFixed(decimals)}`;
      return showUnit ? `${formatted} BTC` : formatted;
    },
    [unit]
  );

  const unitLabel = unit === 'SATS' ? 'sats' : 'BTC';

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        toggleCurrency,
        unit,
        toggleUnit,
        unitLabel,
        priceTHB,
        priceUSD,
        currentPrice,
        exchangeRate,
        formatFiat,
        formatBTC,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCurrency = (): CurrencyContextProps => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
