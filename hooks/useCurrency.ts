'use client';

import { useEffect, useState } from 'react';

interface ExchangeRates {
  [key: string]: number;
}

const FALLBACK_RATES: ExchangeRates = {
  USD: 1,
  BRL: 5.0,
  EUR: 0.92,
  GBP: 0.79,
  MXN: 17.5,
  ARS: 850,
  COP: 4000,
  CLP: 900,
  PEN: 3.7,
  NGN: 1500,
  KES: 155,
  ZAR: 18.5,
  GHS: 12.5,
  INR: 83,
  JPY: 150,
  CNY: 7.2,
};

export function useCurrency(targetCurrency: string = 'USD') {
  const [rates, setRates] = useState<ExchangeRates>(FALLBACK_RATES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRates() {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        
        if (response.ok) {
          const data = await response.json();
          setRates(data.rates);
        }
      } catch (err) {
        console.error('Failed to fetch exchange rates:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRates();
  }, []);

  const convertFromUSD = (usdAmount: number): number => {
    const rate = rates[targetCurrency] || 1;
    return usdAmount * rate;
  };

  const convertToUSD = (localAmount: number): number => {
    const rate = rates[targetCurrency] || 1;
    return localAmount / rate;
  };

  const formatCurrency = (amount: number, currency: string = targetCurrency): string => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return {
    rates,
    loading,
    convertFromUSD,
    convertToUSD,
    formatCurrency,
    targetCurrency,
  };
}
