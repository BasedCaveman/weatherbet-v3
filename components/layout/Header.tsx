'use client';

import { useAuth } from '../../hooks/useAuth';

export default function Header() {
  const { isConnected, address, connect } = useAuth();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌦️</span>
          <span className="font-bold text-xl">WeatherBet</span>
        </div>
        
        <div>
          {isConnected && address ? (
            <button className="px-4 py-2 bg-green-100 text-green-800 rounded-lg">
              {address.slice(0, 6)}...{address.slice(-4)}
            </button>
          ) : (
            <button
              onClick={connect}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
