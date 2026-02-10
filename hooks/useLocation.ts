'use client';

import { useEffect, useState } from 'react';

export interface LocationInfo {
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  currency: string;
  currencySymbol: string;
  language: string;
}

const CURRENCY_MAP: Record<string, { currency: string; symbol: string }> = {
  BR: { currency: 'BRL', symbol: 'R$' },
  US: { currency: 'USD', symbol: '$' },
  GB: { currency: 'GBP', symbol: '£' },
  DE: { currency: 'EUR', symbol: '€' },
  FR: { currency: 'EUR', symbol: '€' },
  IT: { currency: 'EUR', symbol: '€' },
  ES: { currency: 'EUR', symbol: '€' },
  PT: { currency: 'EUR', symbol: '€' },
  MX: { currency: 'MXN', symbol: '$' },
  AR: { currency: 'ARS', symbol: '$' },
  CO: { currency: 'COP', symbol: '$' },
  CL: { currency: 'CLP', symbol: '$' },
  PE: { currency: 'PEN', symbol: 'S/' },
  NG: { currency: 'NGN', symbol: '₦' },
  KE: { currency: 'KES', symbol: 'KSh' },
  ZA: { currency: 'ZAR', symbol: 'R' },
  GH: { currency: 'GHS', symbol: '₵' },
  IN: { currency: 'INR', symbol: '₹' },
  JP: { currency: 'JPY', symbol: '¥' },
  CN: { currency: 'CNY', symbol: '¥' },
};

const DEFAULT_LOCATION: LocationInfo = {
  city: 'São Paulo',
  country: 'Brazil',
  countryCode: 'BR',
  latitude: -23.5505,
  longitude: -46.6333,
  currency: 'BRL',
  currencySymbol: 'R$',
  language: 'pt-BR',
};

export function useLocation() {
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function detectLocation() {
      try {
        const response = await fetch('https://ipapi.co/json/');
        
        if (response.ok) {
          const data = await response.json();
          const currencyInfo = CURRENCY_MAP[data.country_code] || { currency: 'USD', symbol: '$' };
          
          setLocation({
            city: data.city || 'Unknown',
            country: data.country_name || 'Unknown',
            countryCode: data.country_code || 'US',
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            currency: currencyInfo.currency,
            currencySymbol: currencyInfo.symbol,
            language: navigator.language || 'en-US',
          });
        } else {
          setLocation(DEFAULT_LOCATION);
        }
      } catch (err) {
        console.error('Location detection error:', err);
        setLocation(DEFAULT_LOCATION);
        setError('Could not detect location');
      } finally {
        setLoading(false);
      }
    }

    detectLocation();
  }, []);

  return { location, loading, error };
}
