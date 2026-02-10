'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface LocationInfo {
  city: string;
  country: string;
  currency: string;
}

export default function AuthTestPage() {
  const { address, isConnected, isLoading, connect } = useAuth();
  const [os, setOs] = useState<string>('');
  const [authProvider, setAuthProvider] = useState<string>('');
  const [location, setLocation] = useState<LocationInfo | null>(null);

  useEffect(() => {
    // Detect OS
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Mac')) setOs('macOS');
    else if (userAgent.includes('Windows')) setOs('Windows');
    else if (userAgent.includes('Linux')) setOs('Linux');
    else if (userAgent.includes('Android')) setOs('Android');
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) setOs('iOS');
    else setOs('Unknown');

    // Detect auth provider (simplified)
    if (userAgent.includes('Mac') || userAgent.includes('iPhone')) {
      setAuthProvider('Apple');
    } else {
      setAuthProvider('Google');
    }

    // Mock location detection
    setLocation({
      city: 'São Paulo',
      country: 'Brazil',
      currency: 'BRL',
    });
  }, []);

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">🔐 Auth Test Page</h1>

      <div className="space-y-6">
        {/* Connection Status */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Status:</span>{' '}
              {isLoading ? '⏳ Loading...' : isConnected ? '✅ Connected' : '❌ Not Connected'}
            </p>
            {address && (
              <p>
                <span className="font-medium">Address:</span>{' '}
                <code className="bg-gray-100 px-2 py-1 rounded">{address}</code>
              </p>
            )}
          </div>
        </div>

        {/* Device Info */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Device Detection</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">OS:</span> {os}
            </p>
            <p>
              <span className="font-medium">Suggested Auth:</span> {authProvider}
            </p>
          </div>
        </div>

        {/* Location Info */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Location Detection</h2>
          {location ? (
            <div className="space-y-2">
              <p>
                <span className="font-medium">City:</span> {location.city}
              </p>
              <p>
                <span className="font-medium">Country:</span> {location.country}
              </p>
              <p>
                <span className="font-medium">Currency:</span> {location.currency}
              </p>
            </div>
          ) : (
            <p>Detecting location...</p>
          )}
        </div>

        {/* Connect Button */}
        {!isConnected && (
          <button
            onClick={connect}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect with {authProvider}
          </button>
        )}
      </div>
    </main>
  );
}
