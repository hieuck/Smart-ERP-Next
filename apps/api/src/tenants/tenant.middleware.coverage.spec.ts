jest.mock('drizzle-orm', () => ({
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { ForbiddenException } from '@nestjs/common';
import { TenantMiddleware } from './tenant.middleware';

describe('tenant RLS middleware coverage', () => {
  const drizzle = {
    db: {
      execute: jest.fn(),
    },
  };
  const next = jest.fn();
  let middleware: TenantMiddleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new TenantMiddleware(drizzle as any);
  });

  it('rejects missing tenant header and users without tenant membership', async () => {
    await expect(middleware.use({ headers: {} } as any, {} as any, next)).rejects.toBeInstanceOf(ForbiddenException);

    drizzle.db.execute.mockResolvedValueOnce({ rows: [] });
    await expect(
      middleware.use({ headers: { 'x-tenant-id': 'tenant-1' }, user: { sub: 'user-1' } } as any, {} as any, next),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('enriches user membership, sets RLS tenant context, and continues', async () => {
    const req = {
      headers: { 'x-tenant-id': 'tenant-1' },
      user: { permissions: [], role: 'user', sub: 'user-1', tenantId: 'old-tenant' },
    } as any;
    drizzle.db.execute
      .mockResolvedValueOnce({ rows: [{ permissions: ['orders.read'], role: 'admin' }] })
      .mockResolvedValueOnce({ rows: [] });

    await middleware.use(req, {} as any, next);

    expect(req.user).toMatchObject({
      permissions: ['orders.read'],
      role: 'admin',
      sub: 'user-1',
      tenantId: 'tenant-1',
    });
    expect(drizzle.db.execute).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalled();
  });

  it('defaults missing membership permissions to an empty list', async () => {
    const req = {
      headers: { 'x-tenant-id': 'tenant-1' },
      user: { permissions: ['old'], role: 'user', sub: 'user-1', tenantId: 'old-tenant' },
    } as any;
    drizzle.db.execute
      .mockResolvedValueOnce({ rows: [{ permissions: null, role: 'staff' }] })
      .mockResolvedValueOnce({ rows: [] });

    await middleware.use(req, {} as any, next);

    expect(req.user).toMatchObject({
      permissions: [],
      role: 'staff',
      tenantId: 'tenant-1',
    });
  });

  it('sets RLS tenant context for unauthenticated tenant-scoped requests', async () => {
    drizzle.db.execute.mockResolvedValueOnce({ rows: [] });

    await middleware.use({ headers: { 'x-tenant-id': 'tenant-1' } } as any, {} as any, next);

    expect(drizzle.db.execute).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalled();
  });
});
