const mockDb = {
  execute: jest.fn(),
  select: jest.fn(),
};
const mockDatabase = {
  load: jest.fn(),
};

jest.mock('@tauri-apps/plugin-sql', () => mockDatabase, { virtual: true });

describe('web desktop sync service coverage', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
    mockDatabase.load.mockResolvedValue(mockDb);
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: { __TAURI__: true },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).window;
  });

  it('initializes the offline database, caches orders, and reads cached orders', async () => {
    const mod = await import('./desktop-sync-service');
    mockDb.select.mockResolvedValueOnce([{ data: '{"id":"order-1"}' }]).mockResolvedValueOnce([]);

    await mod.initOfflineDb();
    await mod.cacheOrder('order-1', '{"id":"order-1"}');
    await expect(mod.getCachedOrder('order-1')).resolves.toBe('{"id":"order-1"}');
    await expect(mod.getCachedOrder('missing')).resolves.toBeNull();

    expect(mockDatabase.load).toHaveBeenCalledWith('sqlite:smart_erp.db');
    expect(mockDb.execute).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS cached_orders'));
    expect(mockDb.execute).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO cached_orders (id, data, updated_at) VALUES (?, ?, ?)',
      ['order-1', '{"id":"order-1"}', 1770000000000],
    );
  });

  it('no-ops outside Tauri or when database initialization fails', async () => {
    const mod = await import('./desktop-sync-service');
    delete (global as any).window;
    await expect(mod.initOfflineDb()).resolves.toBeUndefined();
    await expect(mod.cacheOrder('order-1', '{}')).resolves.toBeUndefined();
    await expect(mod.getCachedOrder('order-1')).resolves.toBeNull();

    Object.defineProperty(global, 'window', {
      configurable: true,
      value: { __TAURI__: true },
    });
    mockDatabase.load.mockRejectedValueOnce(new Error('tauri unavailable'));
    await expect(mod.initOfflineDb()).resolves.toBeUndefined();
  });
});
