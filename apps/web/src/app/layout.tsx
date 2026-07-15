export const dynamic = 'force-dynamic';
import type { Metadata, Viewport } from 'next';
import { Inter, Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import { I18nProvider } from '@/components/providers/i18n-provider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ServiceWorkerProvider } from '@/components/providers/ServiceWorkerProvider';
import { SyncConflictModal } from '@/components/SyncConflictModal';
import ReportBugButton from '@/components/ReportBugButton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/contexts/auth-context';

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3457'),
  title: {
    default: 'Smart ERP Next',
    template: '%s | Smart ERP Next',
  },
  description: 'Hệ thống ERP cho doanh nghiệp Việt Nam: POS, kho, CRM, kế toán, hóa đơn, sản xuất và báo cáo điều hành.',
  keywords: ['ERP', 'quản lý bán hàng', 'kho hàng', 'kế toán', 'POS', 'CRM', 'sản xuất'],
  authors: [{ name: 'Smart ERP Team' }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Smart ERP Next',
    title: 'Smart ERP Next',
    description: 'ERP web cho bán hàng, kho, CRM, kế toán, hóa đơn và sản xuất.',
  },
  twitter: {
    card: 'summary',
    title: 'Smart ERP Next',
    description: 'ERP web cho bán hàng, kho, CRM, kế toán, hóa đơn và sản xuất.',
  },
  icons: {
    icon: '/favicon.svg',
  },
  manifest: '/manifest.json',
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
 * Inline script to apply dark mode before first paint - prevents flash.
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
        {/* Anti-flash dark mode script - must run before body renders */}
        <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){ try {
            window.__CAPTURED_ERRORS = [];
            function pushErr(msg){ window.__CAPTURED_ERRORS.push(msg); if (window.__CAPTURED_ERRORS.length > 50) window.__CAPTURED_ERRORS.shift(); }
            var orig = console.error;
            console.error = function() {
              pushErr(Array.from(arguments).join(' '));
              orig.apply(console, arguments);
            };
            window.addEventListener('error', function(event){ pushErr('uncaught: ' + event.message + ' @ ' + (event.filename || '') + ':' + (event.lineno || 0)); });
            window.addEventListener('unhandledrejection', function(event){ pushErr('unhandledrejection: ' + event.reason); });
          } catch(e){} })();
        ` }} />
      </head>
      <body className={`${inter.variable} ${beVietnamPro.variable} font-sans antialiased`}>
        <AuthProvider>
          <ErrorBoundary>
            <I18nProvider>
              <ToastProvider>
                <ThemeProvider>
                  <ServiceWorkerProvider>
                    {children}
                    <SyncConflictModal />
                    <ReportBugButton />
                  </ServiceWorkerProvider>
                </ThemeProvider>
              </ToastProvider>
            </I18nProvider>
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
