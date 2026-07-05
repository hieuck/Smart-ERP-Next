import { EnvValidatorService } from './env-validator.service';

describe('EnvValidatorService', () => {
  let validator: EnvValidatorService;

  beforeEach(() => {
    validator = new EnvValidatorService();
    process.env.API_KEY_HMAC_SECRET = 'api-key-hmac-secret';
  });

  afterEach(() => {
    delete process.env.API_KEY_HMAC_SECRET;
  });

  it('passes when all required env vars are set', () => {
    process.env.JWT_SECRET = 'test-some-secret-long-enough';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
    const errors = validator.validate();
    expect(errors).toHaveLength(0);
  });

  it('reports missing JWT_SECRET', () => {
    delete process.env.JWT_SECRET;
    process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
    const errors = validator.validate();
    expect(errors.some((e) => e.includes('JWT_SECRET') && e.includes('missing'))).toBe(true);
  });

  it('reports JWT_SECRET that is too short', () => {
    process.env.JWT_SECRET = 'short';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
    const errors = validator.validate();
    expect(errors.some((e) => e.includes('JWT_SECRET') && e.includes('too short'))).toBe(true);
  });

  it('reports missing DATABASE_URL', () => {
    process.env.JWT_SECRET = 'test-some-secret-long-enough';
    delete process.env.DATABASE_URL;
    const errors = validator.validate();
    expect(errors.some((e) => e.includes('DATABASE_URL'))).toBe(true);
  });

  it('reports missing API_KEY_HMAC_SECRET', () => {
    process.env.JWT_SECRET = 'test-some-secret-long-enough';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
    delete process.env.API_KEY_HMAC_SECRET;
    const errors = validator.validate();
    expect(errors.some((e) => e.includes('API_KEY_HMAC_SECRET'))).toBe(true);
  });

  it('reports multiple missing vars', () => {
    delete process.env.JWT_SECRET;
    delete process.env.DATABASE_URL;
    delete process.env.API_KEY_HMAC_SECRET;
    const errors = validator.validate();
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  it('warns when JWT_SECRET looks like a default/dev value', () => {
    process.env.JWT_SECRET = 'dev-secret-change-in-production';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
    const warnings = validator.validate();
    expect(warnings.some((w) => w.includes('JWT_SECRET') && w.includes('default'))).toBe(true);
  });

  it('accepts production-grade JWT_SECRET', () => {
    process.env.JWT_SECRET = 'test-aB3$xK9#mN7@pQ2$rT5*vW8&zC1';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
    const warnings = validator.validate();
    expect(warnings.some((w) => w.includes('JWT_SECRET') && w.includes('default'))).toBe(false);
  });
});
