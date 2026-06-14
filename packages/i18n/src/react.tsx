'use client';

import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18n, initI18n, type Language } from './index';

export interface I18nProviderProps {
  children: React.ReactNode;
  locale?: Language;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  locale = 'vi',
}) => {
  const [ready, setReady] = useState(i18n.isInitialized);

  useEffect(() => {
    if (!i18n.isInitialized) {
      initI18n(locale).then(() => setReady(true));
    }
  }, [locale]);

  // Render children immediately — avoids blank flash on SSR/hydration
  if (!ready) return <>{children}</>;

  const Provider = I18nextProvider as React.FC<{ i18n: typeof i18n; children: React.ReactNode }>;
  return <Provider i18n={i18n}>{children}</Provider>;
};
