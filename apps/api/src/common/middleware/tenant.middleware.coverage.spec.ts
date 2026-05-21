import { TenantMiddleware } from './tenant.middleware';

describe('common TenantMiddleware coverage', () => {
  const tenantsService = { findBySlug: jest.fn() };
  const middleware = new TenantMiddleware(tenantsService as any);
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves tenant id from headers, query, or body and always continues', async () => {
    tenantsService.findBySlug.mockResolvedValueOnce({ id: 'tenant-1' });
    const headerReq = { body: {}, headers: { 'x-tenant-id': 'acme' }, query: {} } as any;
    await middleware.use(headerReq, {} as any, next);
    expect(headerReq.tenantId).toBe('tenant-1');

    tenantsService.findBySlug.mockResolvedValueOnce({ id: 'tenant-2' });
    const queryReq = { body: {}, headers: {}, query: { tenant: 'beta' } } as any;
    await middleware.use(queryReq, {} as any, next);
    expect(queryReq.tenantId).toBe('tenant-2');

    tenantsService.findBySlug.mockResolvedValueOnce(null);
    const bodyReq = { body: { tenantId: 'missing' }, headers: {}, query: {} } as any;
    await middleware.use(bodyReq, {} as any, next);
    expect(bodyReq.tenantId).toBeUndefined();

    await middleware.use({ body: {}, headers: {}, query: {} } as any, {} as any, next);
    expect(next).toHaveBeenCalledTimes(4);
  });
});
