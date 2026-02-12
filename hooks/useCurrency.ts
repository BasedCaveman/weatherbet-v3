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
  DEF: 0.92, // Germany uses EUR — kept as alias
};

// Currencies that have zero decimal convention (e.g., ¥150 not ¥150.00)
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'CLP', 'VND', 'ISK']);

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

  /**
   * Smart currency formatter:
   * - Uses Mi/Bi suffixes for amounts >= 1,000,000 (common in high-rate currencies like NGN, ARS, COP)
   * - Uses 0 decimals for zero-decimal currencies (JPY, CLP, etc.)
   * - Uses 2 decimals for everything else
   * - Keeps numbers readable regardless of exchange rate
   */
  const formatCurrency = (amount: number, currency: string = targetCurrency): string => {
    const absAmount = Math.abs(amount);

    // Billions
    if (absAmount >= 1_000_000_000) {
      const shortened = amount / 1_000_000_000;
      const formatted = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: shortened % 1 === 0 ? 0 : 1,
        maximumFractionDigits: 1,
      }).format(shortened);
      return `${formatted}Bi`;
    }

    // Millions
    if (absAmount >= 1_000_000) {
      const shortened = amount / 1_000_000;
      const formatted = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: shortened % 1 === 0 ? 0 : 1,
        maximumFractionDigits: 1,
      }).format(shortened);
      return `${formatted}Mi`;
    }

    // Zero-decimal currencies
    if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }

    // Large amounts (>= 10,000) — drop decimals for readability
    if (absAmount >= 10_000) {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }

    // Normal amounts
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
