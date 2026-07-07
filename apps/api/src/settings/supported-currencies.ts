export const SUPPORTED_CURRENCIES = ['VND', 'USD', 'EUR', 'JPY'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
