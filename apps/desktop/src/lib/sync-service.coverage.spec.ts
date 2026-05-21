const constructed: any[] = [];

jest.mock('@smart-erp/sync', () => ({
  SyncService: class {
    constructor(...args: any[]) {
      constructed.push(args);
    }
  },
}));

describe('desktop sync service coverage', () => {
  beforeEach(() => {
    jest.resetModules();
    constructed.length = 0;
    const storage = new Map<string, string>();
    Object.defineProperty(global, 'localStorage', {
      configurable: true,
      value: {
        getItem: jest.fn((key: string) => storage.get(key) ?? null),
        setItem: jest.fn((key: string, value: string) => storage.set(key, value)),
      },
    });
    Object.defineProperty(global, 'crypto', {
      configurable: true,
      value: { randomUUID: jest.fn(() => 'device-1') },
    });
  });

  it('constructs desktop sync service with localStorage-backed token provider', async () => {
    const module = await import('./sync-service');
    const [baseUrl, provider] = constructed[0];

    localStorage.setItem('access_token', 'token-1');
    localStorage.setItem('tenant_id', 'tenant-1');

    expect(baseUrl).toBe('http://localhost:3000');
    expect(provider.getToken()).toBe('token-1');
    expect(provider.getTenantId()).toBe('tenant-1');
    expect(provider.getDeviceId()).toBe('device-1');
    expect(localStorage.setItem).toHaveBeenCalledWith('device_id', 'device-1');
    expect(provider.getDeviceId()).toBe('device-1');

    await expect((module.syncService as any).getToken()).resolves.toBe('token-1');
    await expect((module.syncService as any).getTenantId()).resolves.toBe('tenant-1');
    await (module.syncService as any).setToken('token-2');
    await (module.syncService as any).setTenantId('tenant-2');
    expect(localStorage.setItem).toHaveBeenCalledWith('access_token', 'token-2');
    expect(localStorage.setItem).toHaveBeenCalledWith('tenant_id', 'tenant-2');
  });
});
