'use client';

import { useEffect, useState } from 'react';

// Translations
const translations: Record<string, Record<string, string>> = {
  en: {
    // Header
    'app.name': 'WeatherBet',
    'header.getStarted': 'Get Started',
    'header.connected': 'Connected',
    
    // Hero
    'hero.title': 'Bet on Weather',
    'hero.subtitle': 'Predict rain or temperature. Win if you\'re right!',
    'hero.welcome': 'Welcome from',
    'hero.pricesIn': 'Prices in',
    
    // Market
    'market.active': 'Active',
    'market.resolved': 'Ended',
    'market.rain': 'Rain',
    'market.temperature': 'Temperature',
    'market.willExceed': 'Will it exceed',
    'market.historical': 'Historical Average',
    'market.timeLeft': 'Time Left',
    'market.days': 'days',
    'market.hours': 'hours',
    
    // Betting
    'bet.yes': 'YES',
    'bet.no': 'NO',
    'bet.yesWins': 'More than average',
    'bet.noWins': 'Less than average',
    'bet.amount': 'Amount',
    'bet.yourBet': 'Your bet',
    'bet.potentialWin': 'You could win',
    'bet.placeBet': 'Place Bet',
    'bet.cancel': 'Cancel',
    'bet.connecting': 'Connecting...',
    'bet.approving': 'Approving...',
    'bet.placing': 'Placing bet...',
    'bet.success': 'Bet placed!',
    'bet.error': 'Error placing bet',
    'bet.connectFirst': 'Connect to bet',
    'bet.needFunds': 'Get test funds',
    
    // How it works
    'how.title': 'How It Works',
    'how.step1.title': 'Sign In',
    'how.step1.desc': 'Use Apple or Google. No wallet needed.',
    'how.step2.title': 'Pick YES or NO',
    'how.step2.desc': 'Will weather exceed the average?',
    'how.step3.title': 'Win',
    'how.step3.desc': 'Correct predictions double your bet!',
    
    // Footer
    'footer.tagline': 'Simple weather predictions',
    
    // Errors
    'error.loading': 'Error loading',
    'error.tryAgain': 'Try again',
    'error.noMarkets': 'No markets yet',
    'error.checkBack': 'Check back soon!',
  },
  
  pt: {
    // Header
    'app.name': 'WeatherBet',
    'header.getStarted': 'Começar',
    'header.connected': 'Conectado',
    
    // Hero
    'hero.title': 'Aposte no Clima',
    'hero.subtitle': 'Preveja chuva ou temperatura. Ganhe se acertar!',
    'hero.welcome': 'Bem-vindo de',
    'hero.pricesIn': 'Preços em',
    
    // Market
    'market.active': 'Ativo',
    'market.resolved': 'Encerrado',
    'market.rain': 'Chuva',
    'market.temperature': 'Temperatura',
    'market.willExceed': 'Vai passar de',
    'market.historical': 'Média Histórica',
    'market.timeLeft': 'Tempo Restante',
    'market.days': 'dias',
    'market.hours': 'horas',
    
    // Betting
    'bet.yes': 'SIM',
    'bet.no': 'NÃO',
    'bet.yesWins': 'Mais que a média',
    'bet.noWins': 'Menos que a média',
    'bet.amount': 'Valor',
    'bet.yourBet': 'Sua aposta',
    'bet.potentialWin': 'Você pode ganhar',
    'bet.placeBet': 'Apostar',
    'bet.cancel': 'Cancelar',
    'bet.connecting': 'Conectando...',
    'bet.approving': 'Aprovando...',
    'bet.placing': 'Apostando...',
    'bet.success': 'Aposta feita!',
    'bet.error': 'Erro ao apostar',
    'bet.connectFirst': 'Conecte para apostar',
    'bet.needFunds': 'Obter fundos de teste',
    
    // How it works
    'how.title': 'Como Funciona',
    'how.step1.title': 'Entre',
    'how.step1.desc': 'Use Apple ou Google. Sem carteira.',
    'how.step2.title': 'Escolha SIM ou NÃO',
    'how.step2.desc': 'O clima vai passar da média?',
    'how.step3.title': 'Ganhe',
    'how.step3.desc': 'Previsões certas dobram sua aposta!',
    
    // Footer
    'footer.tagline': 'Previsões climáticas simples',
    
    // Errors
    'error.loading': 'Erro ao carregar',
    'error.tryAgain': 'Tentar novamente',
    'error.noMarkets': 'Sem mercados ainda',
    'error.checkBack': 'Volte em breve!',
  },
  
  es: {
    // Header
    'app.name': 'WeatherBet',
    'header.getStarted': 'Empezar',
    'header.connected': 'Conectado',
    
    // Hero
    'hero.title': 'Apuesta al Clima',
    'hero.subtitle': 'Predice lluvia o temperatura. ¡Gana si aciertas!',
    'hero.welcome': 'Bienvenido desde',
    'hero.pricesIn': 'Precios en',
    
    // Market
    'market.active': 'Activo',
    'market.resolved': 'Terminado',
    'market.rain': 'Lluvia',
    'market.temperature': 'Temperatura',
    'market.willExceed': '¿Superará',
    'market.historical': 'Promedio Histórico',
    'market.timeLeft': 'Tiempo Restante',
    'market.days': 'días',
    'market.hours': 'horas',
    
    // Betting
    'bet.yes': 'SÍ',
    'bet.no': 'NO',
    'bet.yesWins': 'Más que el promedio',
    'bet.noWins': 'Menos que el promedio',
    'bet.amount': 'Cantidad',
    'bet.yourBet': 'Tu apuesta',
    'bet.potentialWin': 'Puedes ganar',
    'bet.placeBet': 'Apostar',
    'bet.cancel': 'Cancelar',
    'bet.connecting': 'Conectando...',
    'bet.approving': 'Aprobando...',
    'bet.placing': 'Apostando...',
    'bet.success': '¡Apuesta hecha!',
    'bet.error': 'Error al apostar',
    'bet.connectFirst': 'Conecta para apostar',
    'bet.needFunds': 'Obtener fondos de prueba',
    
    // How it works
    'how.title': 'Cómo Funciona',
    'how.step1.title': 'Ingresa',
    'how.step1.desc': 'Usa Apple o Google. Sin billetera.',
    'how.step2.title': 'Elige SÍ o NO',
    'how.step2.desc': '¿El clima superará el promedio?',
    'how.step3.title': 'Gana',
    'how.step3.desc': '¡Las predicciones correctas duplican tu apuesta!',
    
    // Footer
    'footer.tagline': 'Predicciones climáticas simples',
    
    // Errors
    'error.loading': 'Error al cargar',
    'error.tryAgain': 'Intentar de nuevo',
    'error.noMarkets': 'Sin mercados aún',
    'error.checkBack': '¡Vuelve pronto!',
  },
  
  fr: {
    // Header
    'app.name': 'WeatherBet',
    'header.getStarted': 'Commencer',
    'header.connected': 'Connecté',
    
    // Hero
    'hero.title': 'Pariez sur la Météo',
    'hero.subtitle': 'Prédisez la pluie ou la température. Gagnez si vous avez raison!',
    'hero.welcome': 'Bienvenue de',
    'hero.pricesIn': 'Prix en',
    
    // Market
    'market.active': 'Actif',
    'market.resolved': 'Terminé',
    'market.rain': 'Pluie',
    'market.temperature': 'Température',
    'market.willExceed': 'Dépassera-t-il',
    'market.historical': 'Moyenne Historique',
    'market.timeLeft': 'Temps Restant',
    'market.days': 'jours',
    'market.hours': 'heures',
    
    // Betting
    'bet.yes': 'OUI',
    'bet.no': 'NON',
    'bet.yesWins': 'Plus que la moyenne',
    'bet.noWins': 'Moins que la moyenne',
    'bet.amount': 'Montant',
    'bet.yourBet': 'Votre pari',
    'bet.potentialWin': 'Vous pouvez gagner',
    'bet.placeBet': 'Parier',
    'bet.cancel': 'Annuler',
    'bet.connecting': 'Connexion...',
    'bet.approving': 'Approbation...',
    'bet.placing': 'Pari en cours...',
    'bet.success': 'Pari placé!',
    'bet.error': 'Erreur de pari',
    'bet.connectFirst': 'Connectez-vous pour parier',
    'bet.needFunds': 'Obtenir des fonds de test',
    
    // How it works
    'how.title': 'Comment ça Marche',
    'how.step1.title': 'Connectez-vous',
    'how.step1.desc': 'Utilisez Apple ou Google. Pas de portefeuille.',
    'how.step2.title': 'Choisissez OUI ou NON',
    'how.step2.desc': 'La météo dépassera-t-elle la moyenne?',
    'how.step3.title': 'Gagnez',
    'how.step3.desc': 'Les bonnes prédictions doublent votre mise!',
    
    // Footer
    'footer.tagline': 'Prédictions météo simples',
    
    // Errors
    'error.loading': 'Erreur de chargement',
    'error.tryAgain': 'Réessayer',
    'error.noMarkets': 'Pas encore de marchés',
    'error.checkBack': 'Revenez bientôt!',
  },
};

// Get language code from browser
function getBrowserLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  
  const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  // Return language if we have translations, otherwise default to English
  return translations[langCode] ? langCode : 'en';
}

export function useTranslation() {
  const [language, setLanguage] = useState<string>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const detectedLang = getBrowserLanguage();
    setLanguage(detectedLang);
    setMounted(true);
  }, []);

  const t = (key: string): string => {
    if (!mounted) return key;
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  const changeLanguage = (lang: string) => {
    if (translations[lang]) {
      setLanguage(lang);
    }
  };

  return {
    t,
    language,
    changeLanguage,
    availableLanguages: Object.keys(translations),
  };
}
