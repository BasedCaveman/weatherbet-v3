'use client';

import dynamic from 'next/dynamic';
import { useMarkets } from '../hooks/useOrderBook';
import { useLocation } from '../hooks/useLocation';
import { useCurrency } from '../hooks/useCurrency';
import { useAuth } from '../hooks/useAuth';
import MarketCard from '../components/MarketCard';

const AuthButton = dynamic(() => import('../components/auth/AuthButton'), {
  ssr: false,
  loading: () => <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
});

export default function Home() {
  const { markets, loading: marketsLoading, error: marketsError } = useMarkets();
  const { location, loading: locationLoading } = useLocation();
  const { formatCurrency, convertFromUSD } = useCurrency(location?.currency || 'USD');
  const { isConnected, connect } = useAuth();

  // Find nearest market based on user location
  const getNearestMarket = () => {
    if (!location || markets.length === 0) return null;
    
    // Simple distance calculation (could be improved with Haversine formula)
    let nearest = markets[0];
    // For now, just return the first active market
    return markets.find(m => !m.resolved) || markets[0];
  };

  const nearestMarket = getNearestMarket();

  const handleBet = async (marketId: number, isYes: boolean, amount: number) => {
    console.log(`Placing bet: Market ${marketId}, ${isYes ? 'YES' : 'NO'}, Amount: ${amount}`);
    // TODO: Implement actual betting logic
    alert(`Bet placed! Market: ${marketId}, Side: ${isYes ? 'YES' : 'NO'}, Amount: ${location?.currencySymbol}${amount}`);
  };

  const formatLocalCurrency = (usdAmount: number) => {
    const localAmount = convertFromUSD(usdAmount);
    return formatCurrency(localAmount, location?.currency || 'USD');
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌦️</span>
            <span className="font-bold text-xl">WeatherBet</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Location Indicator */}
            {location && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <span>📍</span>
                <span>{location.city}, {location.countryCode}</span>
                <span className="text-gray-400">|</span>
                <span>{location.currencySymbol} {location.currency}</span>
              </div>
            )}
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-600 to-blue-700 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Bet on Weather
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Predict rainfall and temperature in cities worldwide. 
            Win if you're right!
          </p>
          
          {/* Location-based welcome */}
          {!locationLoading && location && (
            <div className="inline-flex items-center gap-2 bg-blue-500/30 px-4 py-2 rounded-full text-blue-100">
              <span>📍</span>
              <span>Welcome from {location.city}!</span>
              <span>•</span>
              <span>Prices shown in {location.currency}</span>
            </div>
          )}
        </div>
      </section>

      {/* Featured Market (Nearest to User) */}
      {nearestMarket && (
        <section className="max-w-6xl mx-auto px-4 -mt-8 relative z-10">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-yellow-500">⭐</span>
              <h2 className="text-lg font-semibold text-gray-900">Featured Market</h2>
              {location && (
                <span className="text-sm text-gray-500">• Near {location.city}</span>
              )}
            </div>
            
            <div className="max-w-md mx-auto">
              <MarketCard
                market={nearestMarket}
                currencySymbol={location?.currencySymbol || '$'}
                formatCurrency={formatLocalCurrency}
                onBet={handleBet}
                isConnected={isConnected}
                onConnect={connect}
              />
            </div>
          </div>
        </section>
      )}

      {/* All Markets */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">All Markets</h2>
        
        {marketsLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}
        
        {marketsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p>Error loading markets: {marketsError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 text-sm underline"
            >
              Try again
            </button>
          </div>
        )}
        
        {!marketsLoading && !marketsError && markets.length === 0 && (
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <p className="text-gray-600 text-lg">No markets available yet.</p>
            <p className="text-gray-500 mt-2">Check back soon!</p>
          </div>
        )}

        {!marketsLoading && !marketsError && markets.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {markets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                currencySymbol={location?.currencySymbol || '$'}
                formatCurrency={formatLocalCurrency}
                onBet={handleBet}
                isConnected={isConnected}
                onConnect={connect}
              />
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="bg-white border-t border-gray-200 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔐</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">1. Sign In</h3>
              <p className="text-gray-600">
                Use your Apple or Google account. No wallet setup needed.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">2. Pick a Side</h3>
              <p className="text-gray-600">
                Choose YES or NO on whether the weather will exceed the average.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">3. Win</h3>
              <p className="text-gray-600">
                If you're right, you win! Payouts are automatic.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="flex items-center justify-center gap-2">
            <span>🌦️</span>
            <span>WeatherBet</span>
          </p>
          <p className="text-sm mt-2">
            Decentralized weather prediction markets
          </p>
        </div>
      </footer>
    </main>
  );
}
