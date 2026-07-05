import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';

describe('common auth strategies coverage', () => {
  it('normalizes jwt payloads and defaults missing roles', async () => {
    const strategy = new JwtStrategy({
      get: jest.fn(),
      getOrThrow: jest.fn(() => 'a-long-enough-secret-for-tests'),
    } as any);

    await expect(
      strategy.validate({ email: 'user@example.com', sub: 'user-1', tenantId: 'tenant-1' }),
    ).resolves.toEqual({
      email: 'user@example.com',
      role: 'user',
      sub: 'user-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
    });

    await expect(
      strategy.validate({ email: 'admin@example.com', role: 'admin', sub: 'user-2', tenantId: 'tenant-1' }),
    ).resolves.toMatchObject({ role: 'admin', userId: 'user-2' });
  });

  it('uses the ConfigService JWT secret when no environment secret is present', () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    const config = { getOrThrow: jest.fn(() => 'config-secret-for-tests') };

    new JwtStrategy(config as any);

    expect(config.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it('throws when no JWT secret is configured (fail-fast instead of weak fallback)', () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    const config = {
      getOrThrow: jest.fn(() => {
        throw new Error('JWT_SECRET not found');
      }),
    };

    expect(() => new JwtStrategy(config as any)).toThrow();

    expect(config.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it('returns local users or rejects invalid credentials', async () => {
    const authService = { validateUser: jest.fn() };
    const strategy = new LocalStrategy(authService as any);
    authService.validateUser.mockResolvedValueOnce({ id: 'user-1' }).mockResolvedValueOnce(null);

    await expect(strategy.validate('user@example.com', 'secret')).resolves.toEqual({ id: 'user-1' });
    await expect(strategy.validate('user@example.com', 'bad')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
