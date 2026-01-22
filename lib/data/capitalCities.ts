export interface CapitalCity {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
  population: number;
  currency: string;
  weatherAvg: {
    rainfall: number;      // mm per week (10-year average)
    temperature: number;   // °C average
  };
}

// Top 20 capital cities for MVP
export const capitalCities: CapitalCity[] = [
  {
    id: "sao-paulo",
    name: "São Paulo",
    country: "Brazil",
    lat: -23.5505,
    lon: -46.6333,
    timezone: "America/Sao_Paulo",
    population: 12_300_000,
    currency: "BRL",
    weatherAvg: { rainfall: 38, temperature: 19.5 }
  },
  {
    id: "london",
    name: "London",
    country: "United Kingdom",
    lat: 51.5074,
    lon: -0.1278,
    timezone: "Europe/London",
    population: 9_000_000,
    currency: "GBP",
    weatherAvg: { rainfall: 15, temperature: 11.0 }
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    lat: 35.6762,
    lon: 139.6503,
    timezone: "Asia/Tokyo",
    population: 14_000_000,
    currency: "JPY",
    weatherAvg: { rainfall: 25, temperature: 15.4 }
  },
  {
    id: "new-york",
    name: "New York",
    country: "United States",
    lat: 40.7128,
    lon: -74.0060,
    timezone: "America/New_York",
    population: 8_800_000,
    currency: "USD",
    weatherAvg: { rainfall: 20, temperature: 12.9 }
  },
  {
    id: "paris",
    name: "Paris",
    country: "France",
    lat: 48.8566,
    lon: 2.3522,
    timezone: "Europe/Paris",
    population: 2_200_000,
    currency: "EUR",
    weatherAvg: { rainfall: 16, temperature: 12.0 }
  },
  {
    id: "berlin",
    name: "Berlin",
    country: "Germany",
    lat: 52.5200,
    lon: 13.4050,
    timezone: "Europe/Berlin",
    population: 3_700_000,
    currency: "EUR",
    weatherAvg: { rainfall: 12, temperature: 9.6 }
  },
  {
    id: "sydney",
    name: "Sydney",
    country: "Australia",
    lat: -33.8688,
    lon: 151.2093,
    timezone: "Australia/Sydney",
    population: 5_300_000,
    currency: "AUD",
    weatherAvg: { rainfall: 26, temperature: 17.7 }
  },
  {
    id: "toronto",
    name: "Toronto",
    country: "Canada",
    lat: 43.6532,
    lon: -79.3832,
    timezone: "America/Toronto",
    population: 2_900_000,
    currency: "CAD",
    weatherAvg: { rainfall: 17, temperature: 9.4 }
  },
  {
    id: "mexico-city",
    name: "Mexico City",
    country: "Mexico",
    lat: 19.4326,
    lon: -99.1332,
    timezone: "America/Mexico_City",
    population: 9_200_000,
    currency: "MXN",
    weatherAvg: { rainfall: 25, temperature: 16.0 }
  },
  {
    id: "buenos-aires",
    name: "Buenos Aires",
    country: "Argentina",
    lat: -34.6037,
    lon: -58.3816,
    timezone: "America/Argentina/Buenos_Aires",
    population: 3_100_000,
    currency: "ARS",
    weatherAvg: { rainfall: 22, temperature: 17.0 }
  },
  {
    id: "mumbai",
    name: "Mumbai",
    country: "India",
    lat: 19.0760,
    lon: 72.8777,
    timezone: "Asia/Kolkata",
    population: 20_400_000,
    currency: "INR",
    weatherAvg: { rainfall: 85, temperature: 27.0 }
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    lat: 1.3521,
    lon: 103.8198,
    timezone: "Asia/Singapore",
    population: 5_700_000,
    currency: "SGD",
    weatherAvg: { rainfall: 45, temperature: 27.0 }
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "United Arab Emirates",
    lat: 25.2048,
    lon: 55.2708,
    timezone: "Asia/Dubai",
    population: 3_400_000,
    currency: "AED",
    weatherAvg: { rainfall: 2, temperature: 27.0 }
  },
  {
    id: "amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    lat: 52.3676,
    lon: 4.9041,
    timezone: "Europe/Amsterdam",
    population: 900_000,
    currency: "EUR",
    weatherAvg: { rainfall: 18, temperature: 10.2 }
  },
  {
    id: "madrid",
    name: "Madrid",
    country: "Spain",
    lat: 40.4168,
    lon: -3.7038,
    timezone: "Europe/Madrid",
    population: 3_300_000,
    currency: "EUR",
    weatherAvg: { rainfall: 10, temperature: 14.5 }
  },
  {
    id: "rome",
    name: "Rome",
    country: "Italy",
    lat: 41.9028,
    lon: 12.4964,
    timezone: "Europe/Rome",
    population: 2_900_000,
    currency: "EUR",
    weatherAvg: { rainfall: 18, temperature: 15.5 }
  },
  {
    id: "moscow",
    name: "Moscow",
    country: "Russia",
    lat: 55.7558,
    lon: 37.6173,
    timezone: "Europe/Moscow",
    population: 12_500_000,
    currency: "RUB",
    weatherAvg: { rainfall: 14, temperature: 5.8 }
  },
  {
    id: "beijing",
    name: "Beijing",
    country: "China",
    lat: 39.9042,
    lon: 116.4074,
    timezone: "Asia/Shanghai",
    population: 21_500_000,
    currency: "CNY",
    weatherAvg: { rainfall: 12, temperature: 12.6 }
  },
  {
    id: "seoul",
    name: "Seoul",
    country: "South Korea",
    lat: 37.5665,
    lon: 126.9780,
    timezone: "Asia/Seoul",
    population: 9_700_000,
    currency: "KRW",
    weatherAvg: { rainfall: 28, temperature: 12.5 }
  },
  {
    id: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    lat: 13.7563,
    lon: 100.5018,
    timezone: "Asia/Bangkok",
    population: 10_700_000,
    currency: "THB",
    weatherAvg: { rainfall: 40, temperature: 28.0 }
  }
];

// Helper to get city by id
export function getCityById(id: string): CapitalCity | undefined {
  return capitalCities.find(city => city.id === id);
}

// Helper to get cities by currency
export function getCitiesByCurrency(currency: string): CapitalCity[] {
  return capitalCities.filter(city => city.currency === currency);
}
