'use client';

import { useAuth } from '../../hooks/useAuth';
import { useTranslation, LANGUAGE_META } from '../../hooks/useTranslation';

interface HeaderProps {
  locationName?: string;
  currencyCode?: string;
}

export default function Header({ locationName, currencyCode }: HeaderProps) {
  const { isConnected, address, connect } = useAuth();
  const { t, language, changeLanguage, availableLanguages } = useTranslation();

  return (
    <header className="border-b border-gray-800 bg-gray-950">
      <div className="max-w-lg mx-auto px-3 py-3 flex justify-between items-center gap-2">
        {/* Logo + Location — shrinks gracefully */}
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

        {/* Right side — fixed size controls */}
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

          {/* Auth button — text truncates on small screens */}
          {isConnected && address ? (
            <button className="px-2.5 py-1.5 bg-emerald-900/50 text-emerald-400 rounded-lg text-xs font-medium border border-emerald-800 truncate max-w-[120px]">
              {address.slice(0, 6)}...{address.slice(-4)}
            </button>
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


