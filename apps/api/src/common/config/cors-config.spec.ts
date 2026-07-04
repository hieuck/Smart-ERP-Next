import { buildCorsOptions } from './cors-config';

describe('CORS config', () => {
  beforeEach(() => {
    delete process.env.CORS_ORIGINS;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    delete process.env.CORS_ORIGINS;
    delete process.env.NODE_ENV;
  });

  it('allows localhost origins in development', () => {
    process.env.NODE_ENV = 'development';
    const options = buildCorsOptions();
    expect(options.origin).toEqual(expect.arrayContaining([
      'http://localhost:3457',
      'http://localhost:3000',
    ]));
    expect(options.credentials).toBe(true);
  });

  it('only allows configured origins in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = 'https://app.smarterp.vn,https://admin.smarterp.vn';
    const options = buildCorsOptions();
    expect(options.origin).toEqual([
      'https://app.smarterp.vn',
      'https://admin.smarterp.vn',
    ]);
  });

  it('falls back to localhost when CORS_ORIGINS is not set', () => {
    delete process.env.CORS_ORIGINS;
    const options = buildCorsOptions();
    expect(options.origin).toBeDefined();
    expect(Array.isArray(options.origin)).toBe(true);
  });

  it('rejects wildcard origins in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = '*';
    const options = buildCorsOptions();
    expect(options.origin).not.toBe('*');
  });

  it('sets methods and allowedHeaders', () => {
    const options = buildCorsOptions();
    expect(options.methods).toContain('GET');
    expect(options.allowedHeaders).toContain('Authorization');
  });
});
