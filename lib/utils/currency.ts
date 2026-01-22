export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  format: 'prefix' | 'suffix';
}

// Supported currencies with formatting rules
export const currencies: Record<string, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, format: 'prefix' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2, format: 'prefix' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, format: 'prefix' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, format: 'prefix' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, format: 'prefix' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2, format: 'prefix' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2, format: 'prefix' },
  MXN: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', decimals: 2, format: 'prefix' },
  ARS: { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', decimals: 2, format: 'prefix' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2, format: 'prefix' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2, format: 'prefix' },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', decimals: 2, format: 'suffix' },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', decimals: 2, format: 'suffix' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2, format: 'prefix' },
  KRW: { code: 'KRW', symbol: '₩', name: 'Korean Won', decimals: 0, format: 'prefix' },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', decimals: 2, format: 'prefix' },
};

// Mock exchange rates (in production, fetch from API)
const mockExchangeRates: Record<string, number> = {
  USD: 1.00,
  BRL: 5.00,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 150.00,
  AUD: 1.52,
  CAD: 1.36,
  MXN: 17.00,
  ARS: 350.00,
  INR: 83.00,
  SGD: 1.35,
  AED: 3.67,
  RUB: 92.00,
  CNY: 7.24,
  KRW: 1320.00,
  THB: 35.00,
};

/**
 * Convert USDm amount to local currency
 */
export function usdmToLocal(usdmAmount: number, currencyCode: string): number {
  const rate = mockExchangeRates[currencyCode] || 1;
  return usdmAmount * rate;
}

/**
 * Convert local currency to USDm
 */
export function localToUsdm(localAmount: number, currencyCode: string): number {
  const rate = mockExchangeRates[currencyCode] || 1;
  return localAmount / rate;
}

/**
 * Format amount in local currency
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const config = currencies[currencyCode] || currencies.USD;
  
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  if (config.format === 'prefix') {
    return `${config.symbol}${formatted}`;
  } else {
    return `${formatted} ${config.symbol}`;
  }
}

/**
 * Format with both local and USDm
 * Example: "R$ 50.00 ($10.00)"
 */
export function formatDualCurrency(usdmAmount: number, currencyCode: string): string {
  const localAmount = usdmToLocal(usdmAmount, currencyCode);
  const localFormatted = formatCurrency(localAmount, currencyCode);
  const usdmFormatted = formatCurrency(usdmAmount, 'USD');
  
  if (currencyCode === 'USD') {
    return usdmFormatted;
  }
  
  return `${localFormatted} (${usdmFormatted})`;
}

/**
 * Get currency for a country code
 */
export function getCurrencyForCountry(countryCode: string): string {
  const countryToCurrency: Record<string, string> = {
    BR: 'BRL',
    US: 'USD',
    GB: 'GBP',
    JP: 'JPY',
    AU: 'AUD',
    CA: 'CAD',
    MX: 'MXN',
    AR: 'ARS',
    IN: 'INR',
    SG: 'SGD',
    AE: 'AED',
    RU: 'RUB',
    CN: 'CNY',
    KR: 'KRW',
    TH: 'THB',
    // EU countries
    FR: 'EUR',
    DE: 'EUR',
    ES: 'EUR',
    IT: 'EUR',
    NL: 'EUR',
  };
  
  return countryToCurrency[countryCode] || 'USD';
}
