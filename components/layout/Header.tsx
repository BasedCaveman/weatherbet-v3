'use client';

import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';

interface HeaderProps {
  locationName?: string;
  currencyCode?: string;
}

export default function Header({ locationName, currencyCode }: HeaderProps) {
  const { isConnected, address, connect } = useAuth();
  const { t, language, changeLanguage, availableLanguages } = useTranslation();

  return (
    <header className="border-b border-gray-800 bg-gray-950">
      <div className="max-w-lg mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo + Location */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌦️</span>
          <div>
            <span className="font-bold text-lg text-white">{t('app.name')}</span>
            {locationName && (
              <p className="text-xs text-gray-400 -mt-0.5">
                📍 {locationName}
                {currencyCode && currencyCode !== 'USD' && (
                  <span className="ml-1 text-gray-500">• {currencyCode}</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Language + Auth */}
        <div className="flex items-center gap-2">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="bg-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang === 'en' ? '🇬🇧 EN' : lang === 'pt' ? '🇧🇷 PT' : lang === 'es' ? '🇪🇸 ES' : '🇫🇷 FR'}
              </option>
            ))}
          </select>

          {/* Auth button */}
          {isConnected && address ? (
            <button className="px-3 py-1.5 bg-emerald-900/50 text-emerald-400 rounded-lg text-sm font-medium border border-emerald-800">
              {address.slice(0, 6)}...{address.slice(-4)}
            </button>
          ) : (
            <button
              onClick={connect}
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
            >
              {t('header.getStarted')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
