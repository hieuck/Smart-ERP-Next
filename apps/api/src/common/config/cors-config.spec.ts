import { buildCorsOptions } from './cors-config';

describe('buildCorsOptions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CORS_ORIGINS;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns dev origins when CORS_ORIGINS is not set in non-production', () => {
    process.env.NODE_ENV = 'development';
    const options = buildCorsOptions();

    expect(Array.isArray(options.origin)).toBe(true);
    expect(options.origin).toContain('http://localhost:3000');
  });

  it('uses configured origins in non-production', () => {
    process.env.NODE_ENV = 'development';
    process.env.CORS_ORIGINS = 'http://example.com,http://test.local';
    const options = buildCorsOptions();

    expect(options.origin).toEqual(['http://example.com', 'http://test.local']);
  });

  it('allows wildcard in non-production', () => {
    process.env.NODE_ENV = 'development';
    process.env.CORS_ORIGINS = '*';
    const options = buildCorsOptions();

    expect(options.origin).toBe('*');
  });

  it('throws when CORS_ORIGINS is missing in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CORS_ORIGINS;

    expect(() => buildCorsOptions()).toThrow('CORS_ORIGINS must be configured in production');
  });

  it('throws when wildcard is used in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = '*';

    expect(() => buildCorsOptions()).toThrow('CORS_ORIGINS cannot include wildcard (*) in production');
  });

  it('throws when a production origin is not HTTPS', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = 'http://example.com,https://secure.example.com';

    expect(() => buildCorsOptions()).toThrow(
      'Invalid production CORS origins (must be HTTPS URLs): http://example.com',
    );
  });

  it('accepts HTTPS origins in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = 'https://app.example.com,https://admin.example.com';
    const options = buildCorsOptions();

    expect(options.origin).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });
});
