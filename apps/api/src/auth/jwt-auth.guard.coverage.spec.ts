const baseCanActivate = jest.fn(() => true);

jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn(() => class {
    canActivate(context: unknown) {
      return baseCanActivate(context);
    }
  }),
}));

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('delegates activation to the passport jwt guard', () => {
    const context = { switchToHttp: jest.fn() };
    const guard = new JwtAuthGuard();

    expect(guard.canActivate(context as any)).toBe(true);
    expect(baseCanActivate).toHaveBeenCalledWith(context);
  });
});
