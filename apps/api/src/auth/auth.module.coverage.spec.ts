const registerAsync = jest.fn((options) => ({ module: 'JwtModule', options }));

jest.mock('@nestjs/jwt', () => ({
  JwtModule: { registerAsync },
}));

import './auth.module';

describe('AuthModule JWT registration', () => {
  it('uses configured JWT secret and expiry with a seven day fallback', () => {
    const options = registerAsync.mock.calls[0][0];
    const config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'JWT_SECRET') return 'secret-1';
        return fallback;
      }),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'secret-1';
        throw new Error(`Missing config key: ${key}`);
      }),
    };

    expect(options.useFactory(config)).toEqual({
      secret: 'secret-1',
      signOptions: { expiresIn: '7d' },
    });
  });
});
