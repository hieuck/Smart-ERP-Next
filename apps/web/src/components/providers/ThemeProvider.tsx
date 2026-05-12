'use client';

import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const applyTheme = (theme: string | null) => {
      if (!theme) theme = 'system';
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    const syncThemeFromAPI = async () => {
      try {
        const res = await apiClient.get('/users/me');
        const preferences = res.data.preferences;
        if (preferences && preferences.theme) {
          const storedTheme = localStorage.getItem('theme');
          if (storedTheme !== preferences.theme) {
            localStorage.setItem('theme', preferences.theme);
            applyTheme(preferences.theme);
          }
        } else {
          const stored = localStorage.getItem('theme');
          if (stored) applyTheme(stored);
        }
      } catch (err) {
        const stored = localStorage.getItem('theme');
        if (stored) applyTheme(stored);
      }
    };
    syncThemeFromAPI();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'theme') {
        applyTheme(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const currentTheme = localStorage.getItem('theme');
      if (currentTheme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, []);

  return <>{children}</>;
}
