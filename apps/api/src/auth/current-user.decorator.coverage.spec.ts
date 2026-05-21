const createParamDecorator = jest.fn((factory) => factory);

jest.mock('@nestjs/common', () => ({ createParamDecorator }));

import { CurrentUser } from './current-user.decorator';
import { CurrentUser as ReExportedCurrentUser } from '../common/decorators/current-user.decorator';

describe('CurrentUser decorator factory', () => {
  const user = {
    email: 'demo@example.com',
    role: 'admin',
    sub: 'user-1',
    tenantId: 'tenant-1',
  };

  const ctx = {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  };

  it('returns either the whole user or a requested field from the request context', () => {
    expect(CurrentUser(undefined, ctx as any)).toBe(user);
    expect(CurrentUser('tenantId', ctx as any)).toBe('tenant-1');
    expect(CurrentUser('email', ctx as any)).toBe('demo@example.com');
    expect(ReExportedCurrentUser).toBe(CurrentUser);
    expect(createParamDecorator).toHaveBeenCalledTimes(1);
  });
});
