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

// Currency mapping by country code
const CURRENCY_MAP: Record<string, { currency: string; symbol: string }> = {
  BR: { currency: 'BRL', symbol: 'R$' },
  US: { currency: 'USD', symbol: '$' },
  GB: { currency: 'GBP', symbol: '£' },
  EU: { currency: 'EUR', symbol: '€' },
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
  KR: { currency: 'KRW', symbol: '₩' },
  AU: { currency: 'AUD', symbol: '$' },
  CA: { currency: 'CAD', symbol: '$' },
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
        // Try IP-based geolocation first (faster, no permission needed)
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
          // Fallback to browser geolocation
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const { latitude, longitude } = position.coords;
                
                // Reverse geocode (simplified - use default for now)
                const browserLang = navigator.language;
                const countryCode = browserLang.split('-')[1] || 'US';
                const currencyInfo = CURRENCY_MAP[countryCode] || { currency: 'USD', symbol: '$' };
                
                setLocation({
                  city: 'Your Location',
                  country: 'Unknown',
                  countryCode: countryCode,
                  latitude,
                  longitude,
                  currency: currencyInfo.currency,
                  currencySymbol: currencyInfo.symbol,
                  language: browserLang,
                });
              },
              () => {
                // Permission denied or error - use default
                setLocation(DEFAULT_LOCATION);
              }
            );
          } else {
            setLocation(DEFAULT_LOCATION);
          }
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
