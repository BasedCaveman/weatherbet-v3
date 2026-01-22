'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import AuthButton from '@/components/auth/AuthButton'

export default function Header() {
  const { isAuthenticated } = useAuth()

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🌦️</span>
            <span className="font-bold text-xl">WeatherBet</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/markets" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Markets
            </Link>
            {isAuthenticated && (
              <>
                <Link 
                  href="/account" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  My Account
                </Link>
              </>
            )}
          </nav>

          {/* Auth Button */}
          <div>
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  )
}
