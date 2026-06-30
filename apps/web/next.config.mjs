/** @type {import('next').NextConfig} */
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
  compress: true,
  poweredByHeader: false,
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
              "connect-src 'self' ws: wss:",
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
  rewrites: process.env.NODE_ENV === 'development' ? async () => [
    { source: '/api/:path*', destination: 'http://localhost:3456/api/:path*' },
    { source: '/socket.io/:path*', destination: 'http://localhost:3456/socket.io/:path*' },
  ] : undefined,
};

export default nextConfig;

