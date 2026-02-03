'use client';

import dynamic from 'next/dynamic';

// Dynamically import AuthButton with SSR disabled
const AuthButton = dynamic(() => import('@/components/auth/AuthButton'), {
  ssr: false,
  loading: () => <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
});

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">
            🌦️ WeatherBet
          </h1>
          <p className="text-xl mb-8">
            Bet on weather in capital cities worldwide
          </p>
          <AuthButton />
          <p className="text-sm text-gray-500 mt-4">
            No wallet needed • Simple sign-in with Apple or Google
          </p>
        </div>
        <div className="mt-16 grid text-center lg:grid-cols-3 gap-8">
          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className="mb-3 text-2xl font-semibold">
              📍 Capital Cities
            </h2>
            <p className="m-0 text-sm opacity-50">
              Bet on weather in major cities around the world
            </p>
          </div>
          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className="mb-3 text-2xl font-semibold">
              💰 Your Currency
            </h2>
            <p className="m-0 text-sm opacity-50">
              See prices in your local currency automatically
            </p>
          </div>
          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className="mb-3 text-2xl font-semibold">
              ⚡ Instant
            </h2>
            <p className="m-0 text-sm opacity-50">
              Place bets instantly with minimal fees
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
