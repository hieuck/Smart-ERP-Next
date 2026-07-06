/** @type {import('next').NextConfig} */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3456';
const API_ORIGIN = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return 'http://localhost:3456';
  }
})();
const WS_ORIGIN = API_ORIGIN.replace(/^http/, 'ws');
const WSS_ORIGIN = API_ORIGIN.replace(/^http/, 'wss');

const nextConfig = {
  output: 'standalone',
  transpilePackages: [
    '@smart-erp/i18n',
    '@smart-erp/types',
    '@smart-erp/validation',
    '@smart-erp/hooks',
    '@smart-erp/utils',
    '@smart-erp/sync',
    '@smart-erp/ui',
  ],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { remotePatterns: [] },
  reactStrictMode: true,
  ...(process.env.ANALYZE === 'true' ? { outputFileTracing: true } : {}),
  compress: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              `connect-src 'self' ws: wss: http://localhost:3456 http://127.0.0.1:3456 ${API_ORIGIN} ${WS_ORIGIN} ${WSS_ORIGIN}`,
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_API_URL || API_URL;
    return [
      // Single same-origin proxy for all API calls from the browser. The
      // /api-gateway prefix avoids collisions with Next.js pages/static files.
      { source: '/api-gateway/:path*', destination: `${apiUrl}/:path*` },
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      { source: '/auth/:path*', destination: `${apiUrl}/auth/:path*` },
      { source: '/health', destination: `${apiUrl}/health` },
      { source: '/status', destination: `${apiUrl}/status` },
      { source: '/socket.io/:path*', destination: `${apiUrl}/socket.io/:path*` },
      // Proxy uploaded product images through the web origin so they work
      // regardless of how NEXT_PUBLIC_API_URL is configured.
      { source: '/uploads/:path*', destination: `${apiUrl}/uploads/:path*` },
    ];
  },
};

export default nextConfig;


