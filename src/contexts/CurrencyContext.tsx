import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';

export type Currency = 'THB' | 'USD';

interface CurrencyContextProps {
  currency: Currency;
  toggleCurrency: () => void;
  priceTHB: number;
  priceUSD: number;
  currentPrice: number; // Returns priceTHB or priceUSD based on selected currency
  exchangeRate: number; // THB/USD (e.g. ~35)
  formatFiat: (amountInTHB: number, round?: boolean) => string;
}

const CurrencyContext = createContext<CurrencyContextProps | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
  priceTHB: number;
  priceUSD: number;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children, priceTHB, priceUSD }) => {
  const [currency, setCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('btc_tracker_currency');
    return (saved === 'USD' || saved === 'THB') ? saved : 'THB';
  });

  useEffect(() => {
    localStorage.setItem('btc_tracker_currency', currency);
  }, [currency]);

  const toggleCurrency = () => setCurrency(prev => (prev === 'THB' ? 'USD' : 'THB'));

  // Calculate live exchange rate from Bitcoin prices
  const exchangeRate = useMemo(() => {
    if (!priceTHB || !priceUSD || priceUSD === 0) return 35; // Fallback
    return priceTHB / priceUSD;
  }, [priceTHB, priceUSD]);

  const currentPrice = currency === 'THB' ? priceTHB : priceUSD;

  const formatFiat = (amountInTHB: number, round: boolean = true) => {
    if (currency === 'THB') {
      const val = round ? Math.round(amountInTHB) : amountInTHB;
      return `฿${val.toLocaleString()}`;
    } else {
      const amountInUSD = amountInTHB / exchangeRate;
      const val = round ? Math.round(amountInUSD) : amountInUSD;
      return `$${val.toLocaleString()}`;
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        toggleCurrency,
        priceTHB,
        priceUSD,
        currentPrice,
        exchangeRate,
        formatFiat
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextProps => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
