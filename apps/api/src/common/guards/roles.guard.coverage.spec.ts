import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

describe('RolesGuard coverage', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new RolesGuard(reflector as any);

  const context = (user: any = { role: 'admin' }) =>
    ({
      getClass: jest.fn(() => 'Controller'),
      getHandler: jest.fn(() => 'handler'),
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => ({ user })),
      })),
    }) as any;

  beforeEach(() => jest.clearAllMocks());

  it('allows endpoints without role metadata', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(undefined);

    expect(guard.canActivate(context())).toBe(true);
  });

  it('allows users with a required role', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(['admin', 'owner']);

    expect(guard.canActivate(context({ role: 'owner' }))).toBe(true);
  });

  it('rejects missing or insufficient roles', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(() => guard.canActivate(context({}))).toThrow(new ForbiddenException('No role assigned'));
    expect(() => guard.canActivate(context({ role: 'cashier' }))).toThrow(
      new ForbiddenException('Insufficient permissions'),
    );
  });
});
