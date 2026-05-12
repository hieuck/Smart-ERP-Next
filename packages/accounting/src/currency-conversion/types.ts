export interface CurrencyDTO {
  id?: string;
  currencyCode: string;
  currencyName: string;
  symbol?: string;
  exchangeRate: number;
  isBase?: boolean;
  isActive?: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

export interface ConversionResult {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  convertedAmount: number;
}

export interface ExchangeRateHistory {
  currencyCode: string;
  rates: ExchangeRateEntry[];
}

export interface ExchangeRateEntry {
  date: Date;
  buyRate: number;
  sellRate: number;
  midRate: number;
}

export const COMMON_CURRENCIES = [
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', rate: 1 },
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 25000 },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 27000 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 170 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rate: 31000 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rate: 18500 },
];