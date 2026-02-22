'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation, LANGUAGE_META } from '../../hooks/useTranslation';

// Set to true when deploying to mainnet
const IS_MAINNET = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';

interface HeaderProps {
  locationName?: string;
  currencyCode?: string;
}

export default function Header({ locationName, currencyCode }: HeaderProps) {
  const { isConnected, address, connect, disconnect, openAccount } = useAuth();
  const { t, language, changeLanguage, availableLanguages } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setMenuOpen(false);
    }
  };

  const handleDisconnect = async () => {
    setMenuOpen(false);
    await disconnect();
  };

  const handleViewAccount = () => {
    setMenuOpen(false);
    openAccount();
  };

  return (
    <header className="border-b border-gray-800 bg-gray-950">
      <div className="max-w-lg mx-auto px-3 py-3 flex justify-between items-center gap-2">
        {/* Logo + Location */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <span className="text-xl flex-shrink-0">🌦️</span>
          <div className="min-w-0">
            <span className="font-bold text-base text-white truncate block">{t('app.name')}</span>
            {locationName && (
              <p className="text-[10px] text-gray-400 truncate">
                📍 {locationName}
                {currencyCode && currencyCode !== 'USD' && (
                  <span className="ml-1 text-gray-500">• {currencyCode}</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="bg-gray-800 text-gray-300 text-xs rounded-lg px-1.5 py-1.5 border border-gray-700 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 appearance-none cursor-pointer"
            style={{ minWidth: '62px' }}
          >
            {availableLanguages.map((lang) => {
              const meta = LANGUAGE_META[lang] || { flag: '🌐', label: lang.toUpperCase() };
              return (
                <option key={lang} value={lang}>
                  {meta.flag} {meta.label}
                </option>
              );
            })}
          </select>

          {/* Account button with dropdown */}
          {isConnected && address ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="px-2.5 py-1.5 bg-emerald-900/50 text-emerald-400 rounded-lg text-xs font-medium border border-emerald-800 truncate max-w-[120px] flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" />
                {address.slice(0, 6)}...{address.slice(-4)}
                <svg className={`w-3 h-3 ml-0.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  {/* Account details */}
                  <button
                    onClick={handleViewAccount}
                    className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2 transition-colors"
                  >
                    <span className="text-base">👤</span>
                    {t('header.account') || 'Account'}
                  </button>

                  {/* Copy address */}
                  <button
                    onClick={handleCopyAddress}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2 transition-colors"
                  >
                    <span className="text-base">📋</span>
                    {t('header.copyAddress') || 'Copy Address'}
                  </button>

                  <div className="border-t border-gray-700" />

                  {/* Sign Out */}
                  <button
                    onClick={handleDisconnect}
                    className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-950/50 flex items-center gap-2 transition-colors"
                  >
                    <span className="text-base">🚪</span>
                    {t('header.signOut') || 'Sign Out'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={connect}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors whitespace-nowrap"
            >
              {t('header.getStarted')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
