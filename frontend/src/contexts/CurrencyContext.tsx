'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface CurrencyContextType {
  baseCurrency: string;
  currencySymbol: string;
  formatCurrency: (amount: number) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Currency symbols mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  MMK: 'K',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SGD: 'S$',
  THB: '฿',
  JPY: '¥',
  CNY: '¥'
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [baseCurrency, setBaseCurrency] = useState<string>('MMK');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizationCurrency = async () => {
      try {
        const response = await fetch('/api/v1/organization', {
          headers: {
            'x-tenant-id': 'default', // TODO: Get from auth context
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.baseCurrency) {
            setBaseCurrency(data.data.baseCurrency);
          }
        }
      } catch (error) {
        console.error('Failed to fetch organization currency:', error);
        // Keep default MMK
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizationCurrency();
  }, []);

  const currencySymbol = CURRENCY_SYMBOLS[baseCurrency] || baseCurrency;

  const formatCurrency = (amount: number): string => {
    if (baseCurrency === 'MMK') {
      // Myanmar format: K 1,234,567
      return `K ${amount.toLocaleString()}`;
    } else if (baseCurrency === 'SGD') {
      // Singapore format: S$ 1,234.56
      return `S$ ${amount.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (baseCurrency === 'USD') {
      // US format: $ 1,234.56
      return `$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (baseCurrency === 'EUR') {
      // Euro format: € 1.234,56
      return `€ ${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (baseCurrency === 'GBP') {
      // British format: £ 1,234.56
      return `£ ${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (baseCurrency === 'JPY' || baseCurrency === 'CNY') {
      // Yen/Yuan format: ¥ 1,234 (no decimals)
      return `¥ ${Math.round(amount).toLocaleString()}`;
    } else if (baseCurrency === 'THB') {
      // Thai format: ฿ 1,234.56
      return `฿ ${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      // Generic format
      return `${currencySymbol} ${amount.toLocaleString()}`;
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        baseCurrency,
        currencySymbol,
        formatCurrency,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}