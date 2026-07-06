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
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!i18n.isInitialized) {
      initI18n(locale)
        .then(() => setReady(true))
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('Failed to initialize i18n:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setReady(true);
        });
    }
  }, [locale]);

  if (!ready) {
    return null;
  }

  if (error) {
    return (
      <div data-testid="i18n-error" role="alert">
        <p>Đã xảy ra lỗi khi tải ngôn ngữ. Vui lòng thử lại.</p>
      </div>
    );
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

