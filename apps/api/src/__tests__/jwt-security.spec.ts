import * as fs from 'fs';
import * as path from 'path';
import { JwtStrategy } from '../common/strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy - Security', () => {
  let originalSecret: string | undefined;

  beforeAll(() => {
    originalSecret = process.env.JWT_SECRET;
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('constructs successfully when JWT_SECRET is set', () => {
    process.env.JWT_SECRET = 'test-secret-value';
    const configService = new ConfigService({ JWT_SECRET: 'config-secret' });
    const strategy = new JwtStrategy(configService);
    expect(strategy).toBeDefined();
  });

  it('throws when no JWT_SECRET is configured (fail-fast on missing secret)', () => {
    delete process.env.JWT_SECRET;
    const configService = new ConfigService({});
    expect(() => new JwtStrategy(configService)).toThrow();
  });

  it('has no hardcoded fallback secret in the source file', () => {
    const sourcePath = path.join(__dirname, '../common/strategies/jwt.strategy.ts');
    const content = fs.readFileSync(sourcePath, 'utf-8');
    expect(content).not.toContain('super_secret_jwt_key_for_smart_erp_next_2026');
  });
});
