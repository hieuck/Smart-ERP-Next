const mockSecureStore = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
};

jest.mock('expo-secure-store', () => mockSecureStore);

jest.mock('dexie', () => {
  class MockDexie {
    customers: any;
    products: any;
    orders: any;
    syncQueue: any;

    constructor(public name: string) {
      this.customers = createTable();
      this.products = createTable();
      this.orders = createTable();
      this.syncQueue = createTable();
    }

    version() {
      return {
        stores: jest.fn(() => {
          this.customers = createTable();
          this.products = createTable();
          this.orders = createTable();
          this.syncQueue = createTable();
        }),
      };
    }

    table(entity: 'customers' | 'products' | 'orders' | 'syncQueue') {
      return this[entity];
    }
  }

  const createTable = () => ({
    orderBy: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })),
    delete: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue(undefined),
    count: jest.fn().mockResolvedValue(0),
    put: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(undefined),
  });

  return { __esModule: true, default: MockDexie, Table: class {} };
});

import { db, offlineSync } from './offline-sync';

describe('mobile offline sync coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (offlineSync as any).isSyncing = false;
    process.env.EXPO_PUBLIC_API_URL = 'https://api.smart-erp.test';
    mockSecureStore.getItemAsync.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        access_token: 'token-1',
        tenant_id: 'tenant-1',
        lastSync_customers: '2026-05-20T00:00:00.000Z',
        lastSync_products: '2026-05-20T00:00:00.000Z',
        lastSync_orders: '2026-05-20T00:00:00.000Z',
      };
      return Promise.resolve(values[key] ?? '');
    });
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    (global as any).fetch = jest.fn();
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      configurable: true,
    });
    Object.defineProperty(global, 'window', {
      value: { addEventListener: jest.fn() },
      configurable: true,
    });
  });

  afterEach(() => {
    offlineSync.destroy();
    jest.restoreAllMocks();
    jest.useRealTimers();
    delete (global as any).fetch;
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it('initializes periodic sync and online listener, then destroys the interval', async () => {
    let onlineHandler: (() => void) | undefined;
    (window.addEventListener as jest.Mock).mockImplementation((_event, handler) => {
      onlineHandler = handler;
    });
    const syncSpy = jest.spyOn(offlineSync, 'sync').mockResolvedValue({
      success: true,
      synced: 0,
      conflicts: 0,
      errors: [],
    });

    await offlineSync.init();
    jest.advanceTimersByTime(30000);

    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    onlineHandler?.();
    expect(syncSpy).toHaveBeenCalledTimes(2);
    offlineSync.destroy();
    jest.advanceTimersByTime(30000);
    expect(syncSpy).toHaveBeenCalledTimes(2);
  });

  it('rejects overlapping syncs', async () => {
    (offlineSync as any).isSyncing = true;

    await expect(offlineSync.sync()).resolves.toEqual({
      success: false,
      synced: 0,
      conflicts: 0,
      errors: ['Sync already in progress'],
    });
  });

  it('pushes queued changes, tracks retry conflicts, and pulls server changes', async () => {
    db.syncQueue.orderBy.mockReturnValueOnce({
      toArray: jest.fn().mockResolvedValue([
        { id: 'create-1', entity: 'customers', action: 'create', data: '{"name":"A"}', timestamp: '1', retryCount: 0 },
        { id: 'update-1', entity: 'products', action: 'update', data: '{"name":"B"}', timestamp: '2', retryCount: 1 },
        { id: 'delete-1', entity: 'orders', action: 'delete', data: '{}', timestamp: '3', retryCount: 2 },
        { id: 'fail-1', entity: 'customers', action: 'update', data: '{"name":"C"}', timestamp: '4', retryCount: 5 },
      ]),
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, status: 409 })
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ items: [{ id: 'customer-1', name: 'A' }] }) })
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue([{ id: 'product-1', name: 'B' }]) })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(offlineSync.sync()).resolves.toEqual({
      success: true,
      synced: 3,
      conflicts: 1,
      errors: ['Max retries exceeded for customers:fail-1'],
    });

    expect(db.syncQueue.delete).toHaveBeenCalledWith('create-1');
    expect(db.syncQueue.delete).toHaveBeenCalledWith('update-1');
    expect(db.syncQueue.delete).toHaveBeenCalledWith('delete-1');
    expect(db.syncQueue.update).toHaveBeenCalledWith('fail-1', { retryCount: 6 });
    expect(db.customers.put).toHaveBeenCalledWith(expect.objectContaining({
      id: 'customer-1',
      syncStatus: 'synced',
    }));
    expect(db.products.put).toHaveBeenCalledWith(expect.objectContaining({
      id: 'product-1',
      syncStatus: 'synced',
    }));
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('lastSync_customers', expect.any(String));
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('lastSync_products', expect.any(String));
  });

  it('returns failed sync results for top-level errors', async () => {
    db.syncQueue.orderBy.mockReturnValueOnce({
      toArray: jest.fn().mockRejectedValue(new Error('indexeddb unavailable')),
    });

    await expect(offlineSync.sync()).resolves.toEqual({
      success: false,
      synced: 0,
      conflicts: 0,
      errors: ['indexeddb unavailable'],
    });
  });

  it('queues local changes, counts pending changes, and resolves conflicts', async () => {
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('queue-1');
    db.syncQueue.count.mockResolvedValueOnce(7);
    db.products.get.mockResolvedValueOnce({ id: 'product-1', name: 'Offline product' });

    await expect(offlineSync.queueChange('products', 'create', { id: 'product-1' })).resolves.toBeUndefined();
    expect(db.syncQueue.add).toHaveBeenCalledWith(expect.objectContaining({
      id: 'queue-1',
      entity: 'products',
      action: 'create',
      data: '{"id":"product-1"}',
      retryCount: 0,
    }));

    await expect(offlineSync.getPendingCount()).resolves.toBe(7);

    await expect(offlineSync.resolveConflict('products', 'product-1', 'local')).resolves.toBeUndefined();
    expect(db.syncQueue.add).toHaveBeenCalledWith(expect.objectContaining({
      entity: 'products',
      action: 'update',
      data: '{"id":"product-1","name":"Offline product"}',
    }));
    expect(db.products.update).toHaveBeenCalledWith('product-1', { syncStatus: 'synced' });

    await expect(offlineSync.resolveConflict('orders', 'order-1', 'server')).resolves.toBeUndefined();
    expect(db.orders.update).toHaveBeenCalledWith('order-1', { syncStatus: 'synced' });
  });

  it('uses empty tenant and epoch fallbacks when secure storage values are missing', async () => {
    mockSecureStore.getItemAsync.mockImplementation((key: string) => Promise.resolve(key === 'access_token' ? 'token-1' : ''));
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue([]) });

    await expect((offlineSync as any).pushChange({
      id: 'delete-2',
      entity: 'orders',
      action: 'delete',
      data: '{}',
    })).resolves.toBeUndefined();
    await expect((offlineSync as any).pullChanges('customers')).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenNthCalledWith(1, 'https://api.smart-erp.test/orders/delete-2', expect.objectContaining({
      headers: expect.objectContaining({ 'X-Tenant-ID': '' }),
      method: 'DELETE',
      body: undefined,
    }));
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(encodeURIComponent(new Date(0).toISOString())),
      expect.objectContaining({ headers: expect.objectContaining({ 'X-Tenant-ID': '' }) }),
    );
  });
});
