import type { Metadata, Viewport } from 'next';
import { Inter, Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import { I18nProvider } from '@/components/providers/i18n-provider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Smart ERP Next',
    template: '%s | Smart ERP Next',
  },
  description: 'Hệ thống quản trị doanh nghiệp thông minh — vượt trội KiotViet, MISA, ERPNext',
  keywords: ['ERP', 'quản lý bán hàng', 'kho hàng', 'kế toán', 'POS'],
  authors: [{ name: 'Smart ERP Team' }],
  robots: 'noindex, nofollow',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
};

/**
 * Inline script to apply dark mode before first paint — prevents flash.
 * Reads localStorage 'theme' or falls back to system preference.
 */
const darkModeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (t === 'dark' || (!t && d)) document.documentElement.classList.add('dark');
  } catch(e){}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Anti-flash dark mode script — must run before body renders */}
        <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
      </head>
      <body className={`${inter.variable} ${beVietnamPro.variable} font-sans antialiased`}>
        <I18nProvider>
          <ToastProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </ToastProvider>
        </I18nProvider>
      <SyncConflictModal />
</body>
    </html>
  );
}
