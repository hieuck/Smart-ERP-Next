import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';

describe('common auth strategies coverage', () => {
  const makeJwtStrategy = (usersService: any) =>
    new JwtStrategy(
      {
        get: jest.fn(),
        getOrThrow: jest.fn(() => 'test-long-enough-secret-for-tests'),
      } as any,
      usersService,
    );

  it('looks up the user from the database and returns current role/tenant', async () => {
    const usersService = {
      findActiveByIdAndTenant: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        role: 'manager',
        tenantId: 'tenant-1',
        isActive: true,
      }),
    };
    const strategy = makeJwtStrategy(usersService);

    await expect(
      strategy.validate({ email: 'stale@example.com', sub: 'user-1', tenantId: 'tenant-1', role: 'admin' }),
    ).resolves.toEqual({
      sub: 'user-1',
      userId: 'user-1',
      email: 'user@example.com',
      tenantId: 'tenant-1',
      role: 'manager',
    });

    expect(usersService.findActiveByIdAndTenant).toHaveBeenCalledWith('user-1', 'tenant-1');
  });

  it('rejects JWT when the user does not exist in the database', async () => {
    const usersService = {
      findActiveByIdAndTenant: jest.fn().mockResolvedValue(null),
    };
    const strategy = makeJwtStrategy(usersService);

    await expect(
      strategy.validate({ sub: 'deleted-user', tenantId: 'tenant-1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects JWT when the user belongs to a different tenant', async () => {
    const usersService = {
      findActiveByIdAndTenant: jest.fn().mockResolvedValue(null),
    };
    const strategy = makeJwtStrategy(usersService);

    await expect(
      strategy.validate({ sub: 'user-1', tenantId: 'tenant-2' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(usersService.findActiveByIdAndTenant).toHaveBeenCalledWith('user-1', 'tenant-2');
  });

  it('uses the ConfigService JWT secret when no environment secret is present', () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    const config = { getOrThrow: jest.fn(() => 'test-config-secret-for-tests') };

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
