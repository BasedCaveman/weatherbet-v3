'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const translations: Record<string, Record<string, string>> = {
  en: {
    'app.name': 'WeatherBet',
    'header.getStarted': 'Get Started',
    'header.connected': 'Connected',
    'hero.subtitle': 'Predict rain or temperature. Win if you\'re right!',
    'hero.pricesIn': 'Prices in',
    'market.active': 'Active',
    'market.resolved': 'Ended',
    'market.rain': 'Rain',
    'market.temperature': 'Temperature',
    'market.willExceed': 'Will it exceed',
    'market.historical': 'Avg',
    'market.timeLeft': 'Time Left',
    'market.days': 'days',
    'market.hours': 'hours',
    'bet.yes': 'YES',
    'bet.no': 'NO',
    'bet.yesWins': 'Above average',
    'bet.noWins': 'Below average',
    'bet.amount': 'Amount',
    'bet.yourBet': 'Your bet',
    'bet.potentialWin': 'Potential win',
    'bet.placeBet': 'Place Bet',
    'bet.cancel': 'Cancel',
    'bet.connecting': 'Connecting...',
    'bet.approving': 'Approving...',
    'bet.placing': 'Placing bet...',
    'bet.success': 'Bet placed!',
    'bet.error': 'Error',
    'bet.connectFirst': 'Connect to bet',
    'bet.needFunds': 'Get test funds',
    'bet.netProfit': 'Net profit',
    'bet.available': 'Available',
    'bet.balance': 'Balance',
    'footer.tagline': 'Simple weather predictions',
    'error.loading': 'Loading',
    'error.tryAgain': 'Retry',
    'error.noMarkets': 'No markets yet',
    'error.checkBack': 'Check back soon!',
  },
  pt: {
    'app.name': 'WeatherBet',
    'header.getStarted': 'Começar',
    'header.connected': 'Conectado',
    'hero.subtitle': 'Preveja chuva ou temperatura. Ganhe se acertar!',
    'hero.pricesIn': 'Preços em',
    'market.active': 'Ativo',
    'market.resolved': 'Encerrado',
    'market.rain': 'Chuva',
    'market.temperature': 'Temperatura',
    'market.willExceed': 'Vai passar de',
    'market.historical': 'Média',
    'market.timeLeft': 'Restante',
    'market.days': 'dias',
    'market.hours': 'horas',
    'bet.yes': 'SIM',
    'bet.no': 'NÃO',
    'bet.yesWins': 'Acima da média',
    'bet.noWins': 'Abaixo da média',
    'bet.amount': 'Valor',
    'bet.yourBet': 'Sua aposta',
    'bet.potentialWin': 'Ganho potencial',
    'bet.placeBet': 'Apostar',
    'bet.cancel': 'Cancelar',
    'bet.connecting': 'Conectando...',
    'bet.approving': 'Aprovando...',
    'bet.placing': 'Apostando...',
    'bet.success': 'Aposta feita!',
    'bet.error': 'Erro',
    'bet.connectFirst': 'Conecte para apostar',
    'bet.needFunds': 'Fundos de teste',
    'bet.netProfit': 'Lucro líquido',
    'bet.available': 'Disponível',
    'bet.balance': 'Saldo',
    'footer.tagline': 'Previsões climáticas simples',
    'error.loading': 'Carregando',
    'error.tryAgain': 'Tentar',
    'error.noMarkets': 'Sem mercados',
    'error.checkBack': 'Volte em breve!',
  },
  es: {
    'app.name': 'WeatherBet',
    'header.getStarted': 'Empezar',
    'header.connected': 'Conectado',
    'hero.subtitle': 'Predice lluvia o temperatura. ¡Gana si aciertas!',
    'hero.pricesIn': 'Precios en',
    'market.active': 'Activo',
    'market.resolved': 'Terminado',
    'market.rain': 'Lluvia',
    'market.temperature': 'Temperatura',
    'market.willExceed': '¿Superará',
    'market.historical': 'Promedio',
    'market.timeLeft': 'Restante',
    'market.days': 'días',
    'market.hours': 'horas',
    'bet.yes': 'SÍ',
    'bet.no': 'NO',
    'bet.yesWins': 'Sobre promedio',
    'bet.noWins': 'Bajo promedio',
    'bet.amount': 'Cantidad',
    'bet.yourBet': 'Tu apuesta',
    'bet.potentialWin': 'Ganancia',
    'bet.placeBet': 'Apostar',
    'bet.cancel': 'Cancelar',
    'bet.connecting': 'Conectando...',
    'bet.approving': 'Aprobando...',
    'bet.placing': 'Apostando...',
    'bet.success': '¡Apuesta hecha!',
    'bet.error': 'Error',
    'bet.connectFirst': 'Conecta para apostar',
    'bet.needFunds': 'Fondos de prueba',
    'bet.netProfit': 'Ganancia neta',
    'bet.available': 'Disponible',
    'bet.balance': 'Saldo',
    'footer.tagline': 'Predicciones climáticas simples',
    'error.loading': 'Cargando',
    'error.tryAgain': 'Reintentar',
    'error.noMarkets': 'Sin mercados',
    'error.checkBack': '¡Vuelve pronto!',
  },
  fr: {
    'app.name': 'WeatherBet',
    'header.getStarted': 'Commencer',
    'header.connected': 'Connecté',
    'hero.subtitle': 'Prédisez pluie ou température. Gagnez si c\'est juste!',
    'hero.pricesIn': 'Prix en',
    'market.active': 'Actif',
    'market.resolved': 'Terminé',
    'market.rain': 'Pluie',
    'market.temperature': 'Température',
    'market.willExceed': 'Dépassera-t-il',
    'market.historical': 'Moyenne',
    'market.timeLeft': 'Restant',
    'market.days': 'jours',
    'market.hours': 'heures',
    'bet.yes': 'OUI',
    'bet.no': 'NON',
    'bet.yesWins': 'Au-dessus',
    'bet.noWins': 'En dessous',
    'bet.amount': 'Montant',
    'bet.yourBet': 'Votre pari',
    'bet.potentialWin': 'Gain potentiel',
    'bet.placeBet': 'Parier',
    'bet.cancel': 'Annuler',
    'bet.connecting': 'Connexion...',
    'bet.approving': 'Approbation...',
    'bet.placing': 'Pari en cours...',
    'bet.success': 'Pari placé!',
    'bet.error': 'Erreur',
    'bet.connectFirst': 'Connectez-vous',
    'bet.needFunds': 'Fonds de test',
    'bet.netProfit': 'Profit net',
    'bet.available': 'Disponible',
    'bet.balance': 'Solde',
    'footer.tagline': 'Prédictions météo simples',
    'error.loading': 'Chargement',
    'error.tryAgain': 'Réessayer',
    'error.noMarkets': 'Pas de marchés',
    'error.checkBack': 'Revenez bientôt!',
  },
  de: {
    'app.name': 'WeatherBet',
    'header.getStarted': 'Starten',
    'header.connected': 'Verbunden',
    'hero.subtitle': 'Regen oder Temperatur vorhersagen. Gewinne bei richtiger Prognose!',
    'hero.pricesIn': 'Preise in',
    'market.active': 'Aktiv',
    'market.resolved': 'Beendet',
    'market.rain': 'Regen',
    'market.temperature': 'Temperatur',
    'market.willExceed': 'Wird es überschreiten',
    'market.historical': 'Durchschn.',
    'market.timeLeft': 'Verbleibend',
    'market.days': 'Tage',
    'market.hours': 'Stunden',
    'bet.yes': 'JA',
    'bet.no': 'NEIN',
    'bet.yesWins': 'Über Durchschnitt',
    'bet.noWins': 'Unter Durchschnitt',
    'bet.amount': 'Betrag',
    'bet.yourBet': 'Dein Einsatz',
    'bet.potentialWin': 'Möglicher Gewinn',
    'bet.placeBet': 'Wetten',
    'bet.cancel': 'Abbrechen',
    'bet.connecting': 'Verbinden...',
    'bet.approving': 'Genehmigung...',
    'bet.placing': 'Wette wird platziert...',
    'bet.success': 'Wette platziert!',
    'bet.error': 'Fehler',
    'bet.connectFirst': 'Verbinden zum Wetten',
    'bet.needFunds': 'Testguthaben',
    'bet.netProfit': 'Nettogewinn',
    'bet.available': 'Verfügbar',
    'bet.balance': 'Guthaben',
    'footer.tagline': 'Einfache Wettervorhersagen',
    'error.loading': 'Laden',
    'error.tryAgain': 'Erneut',
    'error.noMarkets': 'Keine Märkte',
    'error.checkBack': 'Bald zurückkommen!',
  },
};

// Language display config — used by Header dropdown
export const LANGUAGE_META: Record<string, { flag: string; label: string }> = {
  en: { flag: '🇬🇧', label: 'EN' },
  pt: { flag: '🇧🇷', label: 'PT' },
  es: { flag: '🇪🇸', label: 'ES' },
  fr: { flag: '🇫🇷', label: 'FR' },
  de: { flag: '🇩🇪', label: 'DE' },
};

function getBrowserLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  try {
    const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
    const langCode = browserLang.split('-')[0].toLowerCase();
    return translations[langCode] ? langCode : 'en';
  } catch {
    return 'en';
  }
}

interface TranslationContextType {
  t: (key: string) => string;
  language: string;
  changeLanguage: (lang: string) => void;
  availableLanguages: string[];
}

// Default context uses English translations directly (never shows raw keys)
const defaultT = (key: string): string => translations['en']?.[key] || key;

const TranslationContext = createContext<TranslationContextType>({
  t: defaultT,
  language: 'en',
  changeLanguage: () => {},
  availableLanguages: Object.keys(translations),
});

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<string>('en');

  useEffect(() => {
    setLanguage(getBrowserLanguage());
  }, []);

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  const changeLanguage = (lang: string) => {
    if (translations[lang]) {
      setLanguage(lang);
    }
  };

  return (
    <TranslationContext.Provider value={{
      t,
      language,
      changeLanguage,
      availableLanguages: Object.keys(translations),
    }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
