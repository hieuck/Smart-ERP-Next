import { EcommerceService } from './ecommerce.service';
import { db } from '@smart-erp/database';

jest.mock('@smart-erp/database', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
    execute: jest.fn().mockResolvedValue({ rows: [] }),
    then: jest.fn(),
  },
}));

jest.mock('@smart-erp/database/schema', () => ({
  ecommerceStores: {
    id: 'id',
    tenantId: 'tenantId',
    platform: 'platform',
    configJson: 'configJson',
    isActive: 'isActive',
    lastSyncAt: 'lastSyncAt',
    lastSyncStatus: 'lastSyncStatus',
  },
  ecommerceSyncLogs: {},
  ecommerceChannelInventory: {
    id: 'id',
    storeId: 'storeId',
    lastSyncedAt: 'lastSyncedAt',
  },
  products: {},
  orders: {},
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn(),
  and: jest.fn((...args: any[]) => args),
  sql: jest.fn(),
  desc: jest.fn(),
}));

const mockDb = db as any;

describe('EcommerceService tenant isolation', () => {
  let service: EcommerceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EcommerceService();
  });

  it('getStore applies tenantId filter in where clause', async () => {
    const storeRow = {
      id: 'store-1',
      tenantId: 'tenant-a',
      platform: 'shopee',
      configJson: '{}',
      isActive: true,
    };
    mockDb.then.mockImplementation((resolve: any) => resolve([storeRow]));

    const result = await (service as any).getStore('store-1', 'tenant-a');

    expect(result).toEqual(storeRow);
    expect(mockDb.where).toHaveBeenCalledWith(expect.any(Array));
  });

  it('getStore throws 404 when store belongs to another tenant', async () => {
    mockDb.then.mockImplementation((resolve: any) => resolve([]));

    await expect((service as any).getStore('store-1', 'tenant-a')).rejects.toThrow('Store not found');
  });

  it('syncStoreProducts throws for unsupported platform', async () => {
    jest.spyOn(service as any, 'getStore').mockResolvedValue({
      id: 'store-1',
      tenantId: 't1',
      platform: 'unknown',
      configJson: '{}',
    });

    await expect((service as any).syncStoreProducts('store-1', 't1')).rejects.toThrow('Unsupported platform for products');
  });

  it('syncStoreOrders throws for unsupported platform', async () => {
    jest.spyOn(service as any, 'getStore').mockResolvedValue({
      id: 'store-1',
      tenantId: 't1',
      platform: 'unknown',
      configJson: '{}',
    });

    await expect((service as any).syncStoreOrders('store-1', 't1')).rejects.toThrow('Unsupported platform for orders');
  });

  it('syncStoreInventory updates lastSyncedAt for each channel inventory row', async () => {
    jest.spyOn(service as any, 'getStore').mockResolvedValue({
      id: 'store-1',
      tenantId: 't1',
      platform: 'shopee',
      configJson: '{}',
    });
    mockDb.then.mockImplementation((resolve: any) => resolve([
      { id: 'inv-1', storeId: 'store-1' },
      { id: 'inv-2', storeId: 'store-1' },
    ]));

    const result = await (service as any).syncStoreInventory('store-1', 't1');

    expect(result).toBe(2);
    expect(mockDb.update).toHaveBeenCalledTimes(2);
    expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ lastSyncedAt: expect.any(Date) }));
  });

  it('syncStoreProductsAndOrders marks status failed when all syncs fail', async () => {
    const store = {
      id: 'store-1',
      tenantId: 't1',
      platform: 'shopee',
      configJson: '{}',
    };
    jest.spyOn(service as any, 'syncStoreProducts').mockRejectedValue(new Error('products failed'));
    jest.spyOn(service as any, 'syncStoreOrders').mockRejectedValue(new Error('orders failed'));
    jest.spyOn(service as any, 'syncStoreInventory').mockRejectedValue(new Error('inventory failed'));

    const result = await (service as any).syncStoreProductsAndOrders(store);

    expect(result.status).toBe('failed');
    expect(result.itemsProcessed).toEqual({ products: 0, orders: 0, inventory: 0 });
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('syncStoreProductsAndOrders marks status partial when products succeed but orders fail', async () => {
    const store = {
      id: 'store-1',
      tenantId: 't1',
      platform: 'shopee',
      configJson: '{}',
    };
    jest.spyOn(service as any, 'syncStoreProducts').mockResolvedValue(2);
    jest.spyOn(service as any, 'syncStoreOrders').mockRejectedValue(new Error('orders failed'));
    jest.spyOn(service as any, 'syncStoreInventory').mockRejectedValue(new Error('inventory failed'));

    const result = await (service as any).syncStoreProductsAndOrders(store);

    expect(result.status).toBe('partial');
    expect(result.itemsProcessed).toEqual({ products: 2, orders: 0, inventory: 0 });
  });

  it('syncAllStores filters by storeId and catches per-store errors', async () => {
    mockDb.then.mockImplementation((resolve: any) => resolve([
      { id: 'store-1', tenantId: 't1', platform: 'shopee', configJson: '{}' },
    ]));
    jest.spyOn(service as any, 'syncStoreProductsAndOrders').mockRejectedValue(new Error('sync failed'));

    const results = await service.syncAllStores('t1', 'store-1');

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('failed');
    expect(results[0].errors).toEqual(expect.arrayContaining([expect.stringContaining('sync failed')]));
  });

  it('syncAllStores syncs all active stores when no storeId is provided', async () => {
    mockDb.then.mockImplementation((resolve: any) => resolve([
      { id: 'store-1', tenantId: 't1', platform: 'shopee', configJson: '{}' },
      { id: 'store-2', tenantId: 't1', platform: 'amazon', configJson: '{}' },
    ]));
    jest.spyOn(service as any, 'syncStoreProductsAndOrders').mockResolvedValue({
      storeId: 'store-1',
      platform: 'shopee',
      syncType: 'all',
      status: 'success',
      itemsProcessed: { products: 1, orders: 1, inventory: 0 },
      errors: [],
      startedAt: new Date(),
      completedAt: new Date(),
    });

    const results = await service.syncAllStores('t1');

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('success');
  });
});
