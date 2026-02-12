'use client';

import { useMarkets } from '../hooks/useOrderBook';
import MarketCard from '../components/MarketCard';
import { useCurrency } from '../hooks/useCurrency';
import { useAppKit } from '@reown/appkit/react';

export default function Home() {
  const { markets, loading, error, refetchMarkets } = useMarkets();
  const { currencySymbol, formatInFiat } = useCurrency();
  const { open } = useAppKit();

  const handleConnect = () => {
    open();
  };

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Loading */}
      {loading && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4 animate-bounce">🌤️</div>
          <p className="text-gray-400 text-lg">Loading markets...</p>
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
            Retry
          </button>
        </div>
      )}

      {/* Markets */}
      {!loading && !error && markets.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🏜️</div>
          <p className="text-gray-400 text-lg">No active markets yet</p>
        </div>
      )}

      {!loading && markets.map((market) => (
        <MarketCard
          key={market.id}
          market={market}
          currencySymbol={currencySymbol}
          formatCurrency={formatInFiat}
          onConnect={handleConnect}
        />
      ))}

      {/* Footer */}
      {!loading && markets.length > 0 && (
        <footer className="text-center py-8">
          <p className="text-xs text-gray-500">
            7-day predictions • 10y average baseline
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Built on MegaETH ⚡
          </p>
        </footer>
      )}
    </main>
  );
}
