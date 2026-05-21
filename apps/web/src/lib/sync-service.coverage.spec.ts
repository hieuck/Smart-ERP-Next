const mockApiClient = {
  post: jest.fn(),
};

const mockProducts = {
  put: jest.fn(),
  where: jest.fn(),
};

const mockSyncLog = {
  orderBy: jest.fn(),
  add: jest.fn(),
};

jest.mock('./api-client', () => ({ apiClient: mockApiClient }));

jest.mock('./offline-db', () => ({
  db: {
    products: mockProducts,
    syncLog: mockSyncLog,
  },
}));

import { SyncService } from './sync-service';

const mockLastSync = (value: any) => {
  mockSyncLog.orderBy.mockReturnValue({
    last: jest.fn().mockResolvedValue(value),
  });
};

const mockLocalChanges = (changes: any[]) => {
  mockProducts.where.mockReturnValue({
    above: jest.fn().mockReturnValue({
      toArray: jest.fn().mockResolvedValue(changes),
    }),
  });
};

describe('SyncService coverage', () => {
  let service: SyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SyncService();
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (global as any).window;
    delete (global as any).localStorage;
    delete (global as any).CustomEvent;
  });

  it('pulls remote changes into offline storage and stores the vector clock', async () => {
    mockLastSync({ vectorClock: { products: 2 } });
    mockApiClient.post.mockResolvedValueOnce({
      data: {
        changes: {
          products: [{ id: 'product-1', name: 'Coffee', sku: 'CF', stock: 5 }],
        },
        vectorClock: { products: 3 },
      },
    });

    await service.pull();

    expect(mockApiClient.post).toHaveBeenCalledWith('/sync/pull', {
      clientId: expect.any(String),
      vectorClock: { products: 2 },
    });
    expect(mockProducts.put).toHaveBeenCalledWith(expect.objectContaining({
      id: 'product-1',
      updatedAt: expect.any(Number),
    }));
    expect(mockSyncLog.add).toHaveBeenCalledWith(expect.objectContaining({
      clientId: expect.any(String),
      vectorClock: { products: 3 },
    }));

    mockLastSync(undefined);
    mockApiClient.post.mockResolvedValueOnce({
      data: {
        changes: {},
        vectorClock: { products: 0 },
      },
    });
    await service.pull();
    expect(mockApiClient.post).toHaveBeenLastCalledWith('/sync/pull', {
      clientId: expect.any(String),
      vectorClock: {},
    });
  });

  it('skips push when there are no local changes', async () => {
    mockLastSync({ lastSyncAt: 1000 });
    mockLocalChanges([]);

    await service.push();

    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  it('pushes local changes and pulls fresh state afterwards', async () => {
    mockSyncLog.orderBy
      .mockReturnValueOnce({ last: jest.fn().mockResolvedValue({ lastSyncAt: 1000 }) })
      .mockReturnValueOnce({ last: jest.fn().mockResolvedValue({ vectorClock: { products: 4 } }) });
    mockLocalChanges([
      {
        id: 'product-1',
        name: 'Coffee',
        sku: 'CF',
        stock: 6,
        minStock: 2,
        reorderQuantity: 5,
        leadTimeDays: 3,
        safetyStock: 1,
        deleted: false,
        ignored: 'not-sent',
      },
    ]);
    mockApiClient.post
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ data: { changes: { products: [] }, vectorClock: { products: 5 } } });

    await service.push();

    expect(mockApiClient.post).toHaveBeenNthCalledWith(1, '/sync/push', {
      clientId: expect.any(String),
      changes: {
        products: [{
          id: 'product-1',
          name: 'Coffee',
          sku: 'CF',
          stock: 6,
          minStock: 2,
          reorderQuantity: 5,
          leadTimeDays: 3,
          safetyStock: 1,
          deleted: false,
        }],
      },
    });
    expect(mockApiClient.post).toHaveBeenNthCalledWith(2, '/sync/pull', expect.any(Object));
  });

  it('surfaces push conflicts to the browser event layer', async () => {
    const dispatchEvent = jest.fn();
    (global as any).window = { dispatchEvent };
    (global as any).localStorage = {
      getItem: jest.fn().mockReturnValue('client-1'),
      setItem: jest.fn(),
    };
    (global as any).CustomEvent = jest.fn((type, init) => ({ type, ...init }));
    mockLastSync({ lastSyncAt: 0 });
    mockLocalChanges([{ id: 'product-1', name: 'Coffee' }]);
    mockApiClient.post.mockRejectedValueOnce({ response: { status: 409 } });

    await expect(service.push()).rejects.toThrow('Conflict detected');

    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'sync-conflict',
      detail: expect.objectContaining({ entityType: 'product' }),
    }));
  });

  it('retries transient operations and surfaces non-conflict push failures', async () => {
    const transient = jest.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('ok');
    await expect((service as any).withRetry(transient, 2, 0)).resolves.toBe('ok');
    await expect((service as any).withRetry(jest.fn(), 0, 0)).rejects.toThrow('Unreachable');

    jest.spyOn(service as any, 'withRetry').mockRejectedValueOnce({ response: { status: 500 } });
    mockLastSync({ lastSyncAt: 0 });
    mockLocalChanges([{ id: 'product-1', name: 'Coffee' }]);

    await expect(service.push()).rejects.toEqual({ response: { status: 500 } });
  });

  it('creates and persists a browser client id when local storage has none', async () => {
    jest.resetModules();
    const storage = new Map<string, string>();
    (global as any).window = {};
    (global as any).localStorage = {
      getItem: jest.fn((key: string) => storage.get(key) ?? null),
      setItem: jest.fn((key: string, value: string) => storage.set(key, value)),
    };
    Object.defineProperty(global, 'crypto', {
      configurable: true,
      value: { randomUUID: jest.fn(() => 'client-1') },
    });

    const { SyncService: BrowserSyncService } = await import('./sync-service');
    const browserService = new BrowserSyncService();

    expect((browserService as any).clientId).toBe('client-1');
    expect(localStorage.setItem).toHaveBeenCalledWith('sync_client_id', 'client-1');
  });

  it('runs full sync, conflict resolution, and debounced queue sync', async () => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(service, 'push').mockResolvedValue(undefined);
    jest.spyOn(service, 'pull').mockResolvedValue(undefined);

    await service.sync();
    await service.syncAll();
    await service.resolveConflict('conflict-1', 'local');
    service.queueSync();
    service.queueSync();
    jest.runOnlyPendingTimers();

    expect(service.push).toHaveBeenCalledTimes(3);
    expect(service.pull).toHaveBeenCalledTimes(3);
  });
});
