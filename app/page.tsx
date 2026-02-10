'use client';

import dynamic from 'next/dynamic';
import { useMarkets } from '../hooks/useOrderBook';
import { useLocation } from '../hooks/useLocation';
import { useCurrency } from '../hooks/useCurrency';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import MarketCard from '../components/MarketCard';

const AuthButton = dynamic(() => import('../components/auth/AuthButton'), {
  ssr: false,
  loading: () => <div className="h-12 w-32 bg-gray-700 rounded-xl animate-pulse" />
});

export default function Home() {
  const { markets, loading: marketsLoading, error: marketsError } = useMarkets();
  const { location, loading: locationLoading } = useLocation();
  const { formatCurrency, convertFromUSD } = useCurrency(location?.currency || 'USD');
  const { isConnected, connect } = useAuth();
  const { t } = useTranslation();

  const formatLocalCurrency = (usdAmount: number) => {
    const localAmount = convertFromUSD(usdAmount);
    return formatCurrency(localAmount, location?.currency || 'USD');
  };

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🌦️</span>
            <span className="font-bold text-xl text-white">{t('app.name')}</span>
          </div>
          
          <div className="flex items-center gap-3">
            {location && (
              <div className="hidden sm:flex items-center gap-1 text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                <span>📍</span>
                <span>{location.countryCode}</span>
                <span>•</span>
                <span>{location.currencySymbol}</span>
              </div>
            )}
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Hero - Mobile Optimized */}
      <section className="bg-gradient-to-b from-emerald-900 via-teal-900 to-gray-950 py-10 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            {t('hero.title')}
          </h1>
          <p className="text-lg text-emerald-200 mb-6">
            {t('hero.subtitle')}
          </p>
          
          {!locationLoading && location && (
            <div className="inline-flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full text-emerald-300 text-sm">
              <span>📍</span>
              <span>{t('hero.welcome')} {location.city}</span>
              <span>•</span>
              <span>{t('hero.pricesIn')} {location.currency}</span>
            </div>
          )}
        </div>
      </section>

      {/* Markets */}
      <section className="max-w-lg mx-auto px-4 py-8 -mt-4">
        {marketsLoading && (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-gray-900 rounded-3xl p-6 animate-pulse">
                <div className="h-8 bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-6 bg-gray-700 rounded w-3/4 mb-6"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-32 bg-gray-700 rounded-2xl"></div>
                  <div className="h-32 bg-gray-700 rounded-2xl"></div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {marketsError && (
          <div className="bg-red-900/30 border border-red-700 rounded-2xl p-6 text-center">
            <p className="text-red-400 text-lg mb-3">{t('error.loading')}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 text-white rounded-xl font-medium"
            >
              {t('error.tryAgain')}
            </button>
          </div>
        )}
        
        {!marketsLoading && !marketsError && markets.length === 0 && (
          <div className="bg-gray-900 rounded-3xl p-10 text-center">
            <span className="text-6xl mb-4 block">🌤️</span>
            <p className="text-gray-300 text-xl mb-2">{t('error.noMarkets')}</p>
            <p className="text-gray-500">{t('error.checkBack')}</p>
          </div>
        )}

        {!marketsLoading && !marketsError && markets.length > 0 && (
          <div className="space-y-6">
            {markets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                currencySymbol={location?.currencySymbol || '$'}
                formatCurrency={formatLocalCurrency}
                onConnect={connect}
              />
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="bg-gray-900 py-12 px-4 mt-8">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            {t('how.title')}
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🔐</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-white mb-1">{t('how.step1.title')}</h3>
                <p className="text-gray-400">{t('how.step1.desc')}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-yellow-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-white mb-1">{t('how.step2.title')}</h3>
                <p className="text-gray-400">{t('how.step2.desc')}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-white mb-1">{t('how.step3.title')}</h3>
                <p className="text-gray-400">{t('how.step3.desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 border-t border-gray-800 py-8">
        <div className="max-w-lg mx-auto px-4 text-center">
          <p className="flex items-center justify-center gap-2 text-gray-400">
            <span className="text-2xl">🌦️</span>
            <span className="font-bold text-white">{t('app.name')}</span>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {t('footer.tagline')}
          </p>
        </div>
      </footer>
    </main>
  );
}
