export interface LocationInfo {
  country: string;      // Two-letter country code (e.g., "BR", "US")
  countryName: string;  // Full country name
  city?: string;
  currency: string;     // Currency code (e.g., "BRL", "USD")
  timezone: string;
  language: string;     // Two-letter language code (e.g., "pt", "en")
}

/**
 * Detect user location from IP address
 * In production, this would use a real IP geolocation API
 */
export async function detectLocation(): Promise<LocationInfo> {
  try {
    // TODO: Replace with real IP geolocation API (e.g., ipapi.co, ipinfo.io)
    // For now, return mock data based on browser language/timezone
    
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language.split('-')[0];
    
    // Guess location from timezone (rough approximation)
    const locationFromTimezone = guessLocationFromTimezone(timezone, language);
    
    return locationFromTimezone;
  } catch (error) {
    console.error('Failed to detect location:', error);
    // Default to US
    return {
      country: 'US',
      countryName: 'United States',
      currency: 'USD',
      timezone: 'America/New_York',
      language: 'en',
    };
  }
}

/**
 * Guess location from browser timezone
 * This is imperfect but works for MVP without external API
 */
function guessLocationFromTimezone(timezone: string, language: string): LocationInfo {
  const timezoneMap: Record<string, LocationInfo> = {
    'America/Sao_Paulo': {
      country: 'BR',
      countryName: 'Brazil',
      currency: 'BRL',
      timezone: 'America/Sao_Paulo',
      language: 'pt',
    },
    'Europe/London': {
      country: 'GB',
      countryName: 'United Kingdom',
      currency: 'GBP',
      timezone: 'Europe/London',
      language: 'en',
    },
    'Asia/Tokyo': {
      country: 'JP',
      countryName: 'Japan',
      currency: 'JPY',
      timezone: 'Asia/Tokyo',
      language: 'ja',
    },
    'America/New_York': {
      country: 'US',
      countryName: 'United States',
      currency: 'USD',
      timezone: 'America/New_York',
      language: 'en',
    },
    'Europe/Paris': {
      country: 'FR',
      countryName: 'France',
      currency: 'EUR',
      timezone: 'Europe/Paris',
      language: 'fr',
    },
    'Europe/Berlin': {
      country: 'DE',
      countryName: 'Germany',
      currency: 'EUR',
      timezone: 'Europe/Berlin',
      language: 'de',
    },
    'Australia/Sydney': {
      country: 'AU',
      countryName: 'Australia',
      currency: 'AUD',
      timezone: 'Australia/Sydney',
      language: 'en',
    },
    'America/Toronto': {
      country: 'CA',
      countryName: 'Canada',
      currency: 'CAD',
      timezone: 'America/Toronto',
      language: 'en',
    },
  };

  // Try exact match first
  if (timezoneMap[timezone]) {
    return timezoneMap[timezone];
  }

  // Try partial match (e.g., "Europe/Madrid" -> use EUR)
  if (timezone.startsWith('Europe/')) {
    return {
      country: 'EU',
      countryName: 'Europe',
      currency: 'EUR',
      timezone,
      language: language || 'en',
    };
  }

  if (timezone.startsWith('America/')) {
    return {
      country: 'US',
      countryName: 'United States',
      currency: 'USD',
      timezone,
      language: language || 'en',
    };
  }

  if (timezone.startsWith('Asia/')) {
    return {
      country: 'JP',
      countryName: 'Japan',
      currency: 'JPY',
      timezone,
      language: language || 'en',
    };
  }

  // Default fallback
  return {
    country: 'US',
    countryName: 'United States',
    currency: 'USD',
    timezone: 'America/New_York',
    language: 'en',
  };
}

/**
 * Get user's operating system
 */
export function getOperatingSystem(): 'ios' | 'macos' | 'android' | 'windows' | 'linux' | 'other' {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }
  
  if (/mac os x/.test(userAgent) && !/iphone|ipad|ipod/.test(userAgent)) {
    return 'macos';
  }
  
  if (/android/.test(userAgent)) {
    return 'android';
  }
  
  if (/windows/.test(userAgent)) {
    return 'windows';
  }
  
  if (/linux/.test(userAgent)) {
    return 'linux';
  }
  
  return 'other';
}

/**
 * Determine which auth provider to show based on OS
 */
export function getPreferredAuthProvider(): 'apple' | 'google' {
  const os = getOperatingSystem();
  
  // iOS and macOS users see Apple Sign-In
  if (os === 'ios' || os === 'macos') {
    return 'apple';
  }
  
  // Everyone else sees Google Sign-In
  return 'google';
}
