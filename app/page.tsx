'use client';

import { useEffect, useState } from 'react';
import { useMarkets } from '../hooks/useOrderBook';
import MarketCard from '../components/MarketCard';
import Header from '../components/layout/Header';
import { useCurrency } from '../hooks/useCurrency';
import { useTranslation } from '../hooks/useTranslation';
import { useAppKit } from '@reown/appkit/react';

// Detect user's currency from timezone
function detectCurrencyCode(): string {
  if (typeof window === 'undefined') return 'USD';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const region = tz.split('/')[0];
    const city = tz.split('/')[1] || '';

    // Brazil
    if (tz.includes('Sao_Paulo') || tz.includes('Fortaleza') || tz.includes('Recife') ||
        tz.includes('Bahia') || tz.includes('Belem') || tz.includes('Manaus') ||
        tz.includes('Cuiaba') || tz.includes('Porto_Velho') || tz.includes('Noronha')) return 'BRL';
    // Mexico
    if (tz.includes('Mexico') || tz.includes('Cancun') || tz.includes('Merida') ||
        tz.includes('Monterrey') || tz.includes('Tijuana') || tz.includes('Hermosillo')) return 'MXN';
    // Argentina
    if (tz.includes('Buenos_Aires') || tz.includes('Argentina')) return 'ARS';
    // Colombia
    if (tz.includes('Bogota')) return 'COP';
    // Chile
    if (tz.includes('Santiago')) return 'CLP';
    // Peru
    if (tz.includes('Lima')) return 'PEN';
    // Nigeria
    if (tz.includes('Lagos')) return 'NGN';
    // Kenya
    if (tz.includes('Nairobi')) return 'KES';
    // South Africa
    if (tz.includes('Johannesburg')) return 'ZAR';
    // Ghana
    if (tz.includes('Accra')) return 'GHS';
    // India
    if (tz.includes('Kolkata') || tz.includes('Calcutta')) return 'INR';
    // Japan
    if (tz.includes('Tokyo')) return 'JPY';
    // China
    if (tz.includes('Shanghai') || tz.includes('Hong_Kong')) return 'CNY';
    // UK
    if (tz.includes('London')) return 'GBP';
    // Europe
    if (region === 'Europe') return 'EUR';
    // Australia
    if (tz.includes('Sydney') || tz.includes('Melbourne') || region === 'Australia') return 'AUD';
    // US/Canada default
    if (region === 'America' && !tz.includes('Sao_Paulo') && !tz.includes('Mexico') &&
        !tz.includes('Buenos_Aires') && !tz.includes('Bogota') && !tz.includes('Santiago') &&
        !tz.includes('Lima')) {
      // Check for Canadian cities
      if (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('Edmonton')) return 'CAD';
      return 'USD';
    }

    return 'USD';
  } catch {
    return 'USD';
  }
}

// Detect location name from timezone
function detectLocationName(): string {
  if (typeof window === 'undefined') return '';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const city = tz.split('/').pop() || '';
    return city.replace(/_/g, ' ');
  } catch {
    return '';
  }
}

export default function Home() {
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [locationName, setLocationName] = useState('');

  useEffect(() => {
    setCurrencyCode(detectCurrencyCode());
    setLocationName(detectLocationName());
  }, []);

  const { markets, loading, error, refetchMarkets } = useMarkets();
  const { convertFromUSD, formatCurrency, targetCurrency } = useCurrency(currencyCode);
  const { t } = useTranslation();
  const { open } = useAppKit();

  const handleConnect = () => {
    open();
  };

  // Format USDm amount in local currency
  const formatLocal = (usdmAmount: number): string => {
    const localAmount = convertFromUSD(usdmAmount);
    return formatCurrency(localAmount);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Header locationName={locationName} currencyCode={currencyCode} />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Tagline */}
        {!loading && markets.length > 0 && (
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              {t('hero.subtitle')}
              {currencyCode !== 'USD' && (
                <span className="text-gray-500 ml-1">• {t('hero.pricesIn')} {currencyCode}</span>
              )}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">🌤️</div>
            <p className="text-gray-400 text-lg">{t('error.loading')}...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-2xl p-6 text-center">
            <p className="text-red-400 font-medium">{error}</p>
            <button
              onClick={refetchMarkets}
              className="mt-4 px-6 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl transition-colors"
            >
              {t('error.tryAgain')}
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && markets.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏜️</div>
            <p className="text-gray-400 text-lg">{t('error.noMarkets')}</p>
            <p className="text-gray-500 text-sm mt-2">{t('error.checkBack')}</p>
          </div>
        )}

        {/* Markets */}
        {!loading && markets.map((market) => (
          <MarketCard
            key={market.id}
            market={market}
            formatLocal={formatLocal}
            onConnect={handleConnect}
          />
        ))}

        {/* Footer */}
        {!loading && markets.length > 0 && (
          <footer className="text-center py-8">
            <p className="text-xs text-gray-500">
              {t('footer.tagline')}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Built on MegaETH ⚡
            </p>
          </footer>
        )}
      </main>
    </div>
  );
}
