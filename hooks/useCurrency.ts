'use client';

import { useEffect, useState } from 'react';

interface ExchangeRates {
  [key: string]: number;
}

const FALLBACK_RATES: ExchangeRates = {
  USD: 1,
  BRL: 5.22,
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
  CAD: 1.36,
  AUD: 1.55,
};

// Currencies where decimals aren't conventional
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
   * Smart currency formatter with compact notation for large numbers.
   * 
   * Examples (BRL at 5.22):
   *   1 USDm     → R$5.22
   *   50 USDm    → R$261.00
   *   10000 USDm → R$52,200
   *   1M USDm    → R$5.2Mi
   *   1B USDm    → R$5.2Bi
   * 
   * Examples (NGN at 1500):
   *   50 USDm    → ₦75,000
   *   10000 USDm → ₦15Mi
   */
  const formatCurrency = (amount: number, currency: string = targetCurrency): string => {
    const absAmount = Math.abs(amount);

    // Guard: NaN or Infinity
    if (!isFinite(amount)) return formatSimple(0, currency);

    // Billions (≥ 1,000,000,000)
    if (absAmount >= 1_000_000_000) {
      const shortened = amount / 1_000_000_000;
      return formatCompact(shortened, currency, 'Bi');
    }

    // Millions (≥ 1,000,000)
    if (absAmount >= 1_000_000) {
      const shortened = amount / 1_000_000;
      return formatCompact(shortened, currency, 'Mi');
    }

    // Zero-decimal currencies (JPY, CLP, etc.)
    if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
      return formatSimple(amount, currency, 0);
    }

    // Large amounts (≥ 1,000) — drop decimals for readability
    if (absAmount >= 1_000) {
      return formatSimple(amount, currency, 0);
    }

    // Normal amounts — 2 decimals
    return formatSimple(amount, currency, 2);
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

// Helper: format with Intl and append suffix (Mi/Bi)
function formatCompact(shortened: number, currency: string, suffix: string): string {
  try {
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(shortened);
    return `${formatted}${suffix}`;
  } catch {
    return `${shortened.toFixed(1)}${suffix}`;
  }
}

// Helper: standard format with configurable decimals
function formatSimple(amount: number, currency: string, decimals: number = 2): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    return `${amount.toFixed(decimals)}`;
  }
}

