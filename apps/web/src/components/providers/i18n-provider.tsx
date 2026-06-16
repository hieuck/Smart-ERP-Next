'use client';

import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n, type Language } from '@/lib/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
  locale?: Language;
}

export function I18nProvider({ children, locale = 'vi' }: I18nProviderProps) {
  const [ready, setReady] = useState(i18n.isInitialized);

  useEffect(() => {
    if (!i18n.isInitialized) {
      initI18n(locale).then(() => setReady(true));
    }
  }, [locale]);

  if (!ready) {
    return null;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

