/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output bundles only the necessary files for production Docker image
  output: 'standalone',
  // NOTE: Remove `output: 'export'` — it breaks API routes and server components.
  // Tauri desktop uses the dev server (localhost:3001) in dev mode and
  // a separate static build via `next export` only when packaging.
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
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [],
  },
  // Strict mode for better React error detection
  reactStrictMode: true,
  // Compress responses
  compress: true,
  // Power header
  poweredByHeader: false,
};

export default nextConfig;

