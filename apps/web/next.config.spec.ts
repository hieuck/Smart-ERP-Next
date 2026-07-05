import fs from 'fs';
import path from 'path';
import vm from 'vm';

/**
 * next.config.mjs is a native ESM module without any imports, so we can load
 * it deterministically under Jest's CommonJS runtime by rewriting its single
 * `export default` statement to `module.exports` and executing the source in
 * an isolated VM context. This avoids relying on experimental ESM support in
 * Jest while still exercising the real, unmodified config source.
 */
interface RewriteRule {
  source: string;
  destination: string;
}

interface LoadedNextConfig {
  rewrites: () => Promise<RewriteRule[]>;
}

const CONFIG_PATH = path.join(__dirname, 'next.config.mjs');

function loadNextConfig(): LoadedNextConfig {
  const source = fs.readFileSync(CONFIG_PATH, 'utf8');
  const commonJsSource = source.replace('export default nextConfig;', 'module.exports = nextConfig;');
  const script = new vm.Script(commonJsSource, { filename: CONFIG_PATH });
  const sandboxModule: { exports: unknown } = { exports: {} };
  const context = vm.createContext({ module: sandboxModule, exports: sandboxModule.exports, process });
  script.runInContext(context);
  return sandboxModule.exports as LoadedNextConfig;
}

describe('next.config.mjs rewrites (/uploads proxy)', () => {
  const ENV_KEYS = ['NEXT_API_URL', 'NEXT_PUBLIC_API_URL'] as const;
  const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    ENV_KEYS.forEach((key) => {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    });
  });

  afterEach(() => {
    ENV_KEYS.forEach((key) => {
      const value = originalEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  it('proxies /uploads/:path* to the default API origin when no API URL env vars are set', async () => {
    const config = loadNextConfig();
    const rewrites = await config.rewrites();

    expect(rewrites).toContainEqual({
      source: '/uploads/:path*',
      destination: 'http://localhost:3456/uploads/:path*',
    });
  });

  it('proxies /uploads/:path* using NEXT_PUBLIC_API_URL when provided', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';

    const config = loadNextConfig();
    const rewrites = await config.rewrites();

    expect(rewrites).toContainEqual({
      source: '/uploads/:path*',
      destination: 'https://api.example.com/uploads/:path*',
    });
  });

  it('prefers NEXT_API_URL over NEXT_PUBLIC_API_URL for the /uploads rewrite', async () => {
    process.env.NEXT_API_URL = 'http://internal-api:4000';
    process.env.NEXT_PUBLIC_API_URL = 'https://public-api.example.com';

    const config = loadNextConfig();
    const rewrites = await config.rewrites();

    expect(rewrites).toContainEqual({
      source: '/uploads/:path*',
      destination: 'http://internal-api:4000/uploads/:path*',
    });
  });

  it('keeps the /uploads rewrite alongside the existing api/auth/health/status/socket.io rewrites', async () => {
    const config = loadNextConfig();
    const rewrites = await config.rewrites();

    expect(rewrites).toEqual([
      { source: '/api/:path*', destination: 'http://localhost:3456/api/:path*' },
      { source: '/auth/:path*', destination: 'http://localhost:3456/auth/:path*' },
      { source: '/health', destination: 'http://localhost:3456/health' },
      { source: '/status', destination: 'http://localhost:3456/status' },
      { source: '/socket.io/:path*', destination: 'http://localhost:3456/socket.io/:path*' },
      { source: '/uploads/:path*', destination: 'http://localhost:3456/uploads/:path*' },
    ]);
  });
});