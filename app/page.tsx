'use client';

import dynamic from 'next/dynamic';
import { useMarkets } from '@/hooks/useOrderBook';

const AuthButton = dynamic(() => import('@/components/auth/AuthButton'), {
  ssr: false,
  loading: () => <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
});

export default function Home() {
  const { markets, loading, error } = useMarkets();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">🌦️ WeatherBet</h1>
          <p className="text-xl mb-8">Bet on weather in capital cities worldwide</p>
          <AuthButton />
          <p className="text-sm text-gray-500 mt-4">
            No wallet needed • Simple sign-in with Apple or Google
          </p>
        </div>

        {/* Markets Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Active Markets</h2>
          
          {loading && (
            <p className="text-center text-gray-500">Loading markets...</p>
          )}
          
          {error && (
            <p className="text-center text-red-500">Error: {error}</p>
          )}
          
          {!loading && !error && markets.length === 0 && (
            <p className="text-center text-gray-500">No active markets</p>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {markets.map((market) => (
              <div
                key={market.id}
                className="rounded-lg border border-gray-200 p-6 hover:border-blue-500 transition-colors"
              >
                <h3 className="text-xl font-semibold mb-2">{market.cityName}</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {market.isRainMarket ? '🌧️ Rain Market' : '🌡️ Temperature Market'}
                </p>
                <div className="flex justify-between text-sm">
                  <span>Historical Avg:</span>
                  <span className="font-medium">
                    {market.isRainMarket 
                      ? `${market.historicalAvg}mm` 
                      : `${market.historicalAvg / 10}°C`}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span>Ends:</span>
                  <span className="font-medium">
                    {new Date(market.endTime * 1000).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span>Status:</span>
                  <span className={market.resolved ? 'text-gray-500' : 'text-green-500'}>
                    {market.resolved ? 'Resolved' : 'Active'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
