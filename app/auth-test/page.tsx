'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getOperatingSystem, getPreferredAuthProvider, detectLocation } from '@/lib/utils/location'
import type { LocationInfo } from '@/lib/utils/location'

export default function AuthTestPage() {
  const { address, isAuthenticated, isConnecting } = useAuth()
  const [os, setOs] = useState<string>('')
  const [authProvider, setAuthProvider] = useState<string>('')
  const [location, setLocation] = useState<LocationInfo | null>(null)

  useEffect(() => {
    // Detect OS
    const detectedOs = getOperatingSystem()
    setOs(detectedOs)

    // Get preferred auth provider
    const provider = getPreferredAuthProvider()
    setAuthProvider(provider)

    // Detect location
    detectLocation().then(setLocation)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Test</h1>

        {/* OS Detection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">OS Detection</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Detected OS:</span>
              <span className="font-mono font-semibold">{os}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Preferred Auth:</span>
              <span className="font-mono font-semibold">{authProvider}</span>
            </div>
          </div>
        </div>

        {/* Location Detection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Location Detection</h2>
          {location ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Country:</span>
                <span className="font-mono font-semibold">{location.countryName} ({location.country})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Currency:</span>
                <span className="font-mono font-semibold">{location.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Timezone:</span>
                <span className="font-mono font-semibold">{location.timezone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Language:</span>
                <span className="font-mono font-semibold">{location.language}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Detecting location...</p>
          )}
        </div>

        {/* Auth Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Is Authenticated:</span>
              <span className={`font-semibold ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
                {isAuthenticated ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Is Connecting:</span>
              <span className={`font-semibold ${isConnecting ? 'text-yellow-600' : 'text-gray-600'}`}>
                {isConnecting ? '⏳ Yes' : '✗ No'}
              </span>
            </div>
            {address && (
              <div className="flex justify-between">
                <span className="text-gray-600">Address:</span>
                <span className="font-mono text-sm">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Expected Behavior */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">Expected Behavior:</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• <strong>iOS/macOS:</strong> Should show "Continue with Apple"</li>
            <li>• <strong>Android/Windows/Linux:</strong> Should show "Continue with Google"</li>
            <li>• <strong>Location:</strong> Should auto-detect from browser timezone</li>
            <li>• <strong>Currency:</strong> Should match detected country</li>
            <li>• <strong>No Web3 jargon:</strong> No "Connect Wallet" text anywhere</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
