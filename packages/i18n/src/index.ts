import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import viCommon from './locales/vi/common.json';
import enCommon from './locales/en/common.json';

export const resources = {
  vi: { common: viCommon },
  en: { common: enCommon },
} as const;

export type Language = keyof typeof resources;
export const defaultLanguage: Language = 'vi';
export const supportedLanguages: Language[] = ['vi', 'en'];

export const initI18n = async () => {
  await i18n.use(initReactI18next).init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'vi',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });
  return i18n;
};

export const formatCurrency = (amount: number, locale: Language = 'vi'): string => {
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency: locale === 'vi' ? 'VND' : 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: Date | string, locale: Language = 'vi'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

export const formatNumber = (num: number, locale: Language = 'vi'): string => {
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(num);
};

export default i18n;