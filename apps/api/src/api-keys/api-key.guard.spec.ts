import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let mockService: { validateKey: jest.Mock };

  beforeEach(() => {
    mockService = { validateKey: jest.fn() };
    guard = new ApiKeyGuard(mockService as any);
  });

  it('allows requests with valid API key', async () => {
    mockService.validateKey.mockResolvedValue({ tenantId: 'tenant-1', keyId: 'key-1' });
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-api-key': 'smart_erp_validkey1234567890' },
        }),
      }),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('blocks requests without API key header', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(false);
  });

  it('blocks requests with invalid API key', async () => {
    mockService.validateKey.mockResolvedValue(null);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-api-key': 'smart_erp_invalidkey1234567890' },
        }),
      }),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(false);
  });
});
