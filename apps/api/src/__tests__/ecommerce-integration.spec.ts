const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

const mockTikTokClient = { getProducts: jest.fn(), getOrders: jest.fn() };
const mockAmazonClient = { getProducts: jest.fn(), getOrders: jest.fn() };
const mockEbayClient = { getProducts: jest.fn(), getOrders: jest.fn() };
const mockShopeeClient = { getProducts: jest.fn(), getOrders: jest.fn() };

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  ecommerceStores: {
    id: 'ecommerceStores.id',
    tenantId: 'ecommerceStores.tenantId',
    isActive: 'ecommerceStores.isActive',
    createdAt: 'ecommerceStores.createdAt',
  },
  ecommerceSyncLogs: {
    tenantId: 'ecommerceSyncLogs.tenantId',
    storeId: 'ecommerceSyncLogs.storeId',
    createdAt: 'ecommerceSyncLogs.createdAt',
  },
  ecommerceChannelInventory: {
    id: 'ecommerceChannelInventory.id',
    storeId: 'ecommerceChannelInventory.storeId',
  },
  products: {
    id: 'products.id',
    tenantId: 'products.tenantId',
    externalId: 'products.externalId',
  },
  orders: {
    id: 'orders.id',
    tenantId: 'orders.tenantId',
    externalId: 'orders.externalId',
  },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
}));

jest.mock('../ecommerce/tiktokshop.client', () => ({
  TikTokShopClient: jest.fn(() => mockTikTokClient),
}));
jest.mock('../ecommerce/amazon.client', () => ({
  AmazonClient: jest.fn(() => mockAmazonClient),
}));
jest.mock('../ecommerce/ebay.client', () => ({
  EbayClient: jest.fn(() => mockEbayClient),
}));
jest.mock('../ecommerce/shopee.client', () => ({
  ShopeeClient: jest.fn(() => mockShopeeClient),
}));

import { EcommerceService } from '../ecommerce/ecommerce.service';
import { encryptConfig } from '../ecommerce/config-encryption';

const encryptedEmptyConfig = encryptConfig('{}');

const selectQueue: any[][] = [];
const insertReturningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(rows)),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeWriteChain = (queue: any[][]) => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(queue.shift() ?? [])),
  };
  return chain;
};

describe('ECommerceService integration', () => {
  let service: EcommerceService;

  beforeEach(() => {
    jest.clearAllMocks();
    selectQueue.length = 0;
    insertReturningQueue.length = 0;
    service = new (EcommerceService as any)();

    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain(insertReturningQueue));
    mockDb.update.mockImplementation(() => makeWriteChain([]));
  });

  // ---------- CRUD: getStores / createStore ----------

  describe('getStores / createStore', () => {
    it('returns stores for a tenant ordered by createdAt desc', async () => {
      const stores = [
        { id: 's1', name: 'Shopee Store', platform: 'shopee', createdAt: new Date('2025-06-02') },
        { id: 's2', name: 'Amazon Store', platform: 'amazon', createdAt: new Date('2025-06-01') },
      ];
      selectQueue.push(stores);

      const result = await service.getStores('tenant-1');
      expect(result).toEqual(stores);
    });

    it('returns empty array when tenant has no stores', async () => {
      selectQueue.push([]);
      const result = await service.getStores('tenant-empty');
      expect(result).toEqual([]);
    });

    it('creates a store and returns it', async () => {
      const newStore = { id: 'new-1', tenantId: 'tenant-1', platform: 'shopee', name: 'My Shop', isActive: true };
      insertReturningQueue.push([newStore]);

      const result = await service.createStore('tenant-1', { platform: 'shopee', name: 'My Shop', configJson: {} });
      expect(result).toMatchObject({ id: 'new-1', platform: 'shopee' });
    });

    it('createStore inserts with isActive=true and encrypted configJson', async () => {
      insertReturningQueue.push([{ id: 's-1' }]);
      await service.createStore('tenant-1', { platform: 'amazon', name: 'Amazon Store', configJson: { key: 'val' } });

      const inserted = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
      expect(inserted).toMatchObject({ tenantId: 'tenant-1', platform: 'amazon', name: 'Amazon Store', isActive: true });
      expect(inserted.configJson).not.toEqual('{"key":"val"}');
    });
  });

  // ---------- syncAllStores orchestration ----------

  describe('syncAllStores', () => {
    it('syncs only requested store when storeId provided', async () => {
      selectQueue.push([{ id: 'store-1', platform: 'shopee', tenantId: 't1', isActive: true }]);
      jest.spyOn(service, 'syncStoreProductsAndOrders').mockResolvedValue({
        storeId: 'store-1', platform: 'shopee', syncType: 'all', status: 'success',
        itemsProcessed: { products: 3, orders: 1, inventory: 2 }, errors: [],
        startedAt: new Date(), completedAt: new Date(),
      });

      const results = await service.syncAllStores('t1', 'store-1');
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ storeId: 'store-1', status: 'success' });
    });

    it('syncs all active stores for a tenant', async () => {
      selectQueue.push([
        { id: 's1', platform: 'shopee', tenantId: 't1', isActive: true },
        { id: 's2', platform: 'amazon', tenantId: 't1', isActive: true },
      ]);
      jest.spyOn(service, 'syncStoreProductsAndOrders')
        .mockResolvedValueOnce({ storeId: 's1', status: 'success', itemsProcessed: { products: 1, orders: 1, inventory: 0 }, errors: [] } as any)
        .mockResolvedValueOnce({ storeId: 's2', status: 'success', itemsProcessed: { products: 1, orders: 0, inventory: 0 }, errors: [] } as any);

      const results = await service.syncAllStores('t1');
      expect(results).toHaveLength(2);
      expect(results[0].storeId).toBe('s1');
      expect(results[1].storeId).toBe('s2');
    });

    it('filters only active stores', async () => {
      selectQueue.push([
        { id: 's1', platform: 'shopee', tenantId: 't1', isActive: true },
      ]);
      jest.spyOn(service, 'syncStoreProductsAndOrders').mockResolvedValue({ storeId: 's1', status: 'success' } as any);

      await service.syncAllStores('t1');
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('continues to next store when one fails', async () => {
      selectQueue.push([
        { id: 's-fail', platform: 'shopee', tenantId: 't1', isActive: true },
        { id: 's-ok', platform: 'amazon', tenantId: 't1', isActive: true },
      ]);
      jest.spyOn(service, 'syncStoreProductsAndOrders')
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce({ storeId: 's-ok', status: 'success', itemsProcessed: { products: 2, orders: 0, inventory: 0 }, errors: [] } as any);

      const results = await service.syncAllStores('t1');
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({ storeId: 's-fail', status: 'failed', errors: ['timeout'] });
      expect(results[1]).toMatchObject({ storeId: 's-ok', status: 'success' });
    });

    it('handles empty store list gracefully', async () => {
      selectQueue.push([]);
      const results = await service.syncAllStores('t1');
      expect(results).toEqual([]);
    });
  });

  // ---------- getSyncLogs pagination / filter ----------

  describe('getSyncLogs', () => {
    it('returns recent sync logs for a tenant', async () => {
      const logs = [
        { id: 'log-1', tenantId: 't1', storeId: 's1', createdAt: new Date('2025-06-03') },
        { id: 'log-2', tenantId: 't1', storeId: 's2', createdAt: new Date('2025-06-02') },
      ];
      selectQueue.push(logs);

      const result = await service.getSyncLogs('t1');
      expect(result).toBe(logs);
    });

    it('filters by storeId when provided', async () => {
      selectQueue.push([{ id: 'log-1', storeId: 's1' }]);
      const result = await service.getSyncLogs('t1', 's1');
      expect(result).toHaveLength(1);
    });

    it('limits results to 50 entries', async () => {
      const logs = Array.from({ length: 50 }, (_, i) => ({ id: `log-${i}` }));
      selectQueue.push(logs);

      const result = await service.getSyncLogs('t1');
      expect(result).toHaveLength(50);
    });

    it('returns empty array when no sync logs exist', async () => {
      selectQueue.push([]);
      const result = await service.getSyncLogs('t1');
      expect(result).toEqual([]);
    });
  });

  // ---------- Marketplace sync methods ----------

  describe('marketplace sync methods', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'upsertProductFromTikTok').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'upsertOrderFromTikTok').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'upsertProductFromAmazon').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'upsertOrderFromAmazon').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'upsertProductFromEbay').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'upsertOrderFromEbay').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'upsertProductFromShopee').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'upsertOrderFromShopee').mockResolvedValue(undefined);
    });

    it('syncs TikTok products with pagination', async () => {
      selectQueue.push([{ id: 'tt-store', tenantId: 't1', configJson: encryptedEmptyConfig }]);
      mockTikTokClient.getProducts
        .mockResolvedValueOnce({ products: [{ id: 'p1' }, { id: 'p2' }], pagination: { has_more: true } })
        .mockResolvedValueOnce({ products: [{ id: 'p3' }], pagination: { has_more: false } });

      const result = await service.syncTikTokShopProducts('tt-store', 't1');
      expect(result).toBe(3);
      expect(mockTikTokClient.getProducts).toHaveBeenCalledTimes(2);
    });

    it('syncs TikTok orders with since parameter', async () => {
      selectQueue.push([{ id: 'tt-store', tenantId: 't1', configJson: encryptedEmptyConfig }]);
      mockTikTokClient.getOrders.mockResolvedValue({
        orders: [{ order_id: 'o1' }], pagination: { has_more: false },
      });

      const result = await service.syncTikTokShopOrders('tt-store', 't1', '2025-01-01');
      expect(result).toBe(1);
      expect(mockTikTokClient.getOrders).toHaveBeenCalledWith('2025-01-01', 1, 100);
    });

    it('syncs Amazon products and orders', async () => {
      selectQueue.push(
        [{ id: 'am-store', tenantId: 't1', configJson: encryptedEmptyConfig }],
        [{ id: 'am-store', tenantId: 't1', configJson: encryptedEmptyConfig }],
      );
      mockAmazonClient.getProducts.mockResolvedValue([{ asin: 'a1' }, { asin: 'a2' }]);
      mockAmazonClient.getOrders.mockResolvedValue([{ AmazonOrderId: 'ao1' }]);

      const prodResult = await service.syncAmazonProducts('am-store', 't1');
      expect(prodResult).toBe(2);

      const ordResult = await service.syncAmazonOrders('am-store', 't1');
      expect(ordResult).toBe(1);
    });

    it('syncs Shopee products with pagination (hasNext)', async () => {
      selectQueue.push([{ id: 'sp-store', tenantId: 't1', configJson: encryptedEmptyConfig }]);
      mockShopeeClient.getProducts
        .mockResolvedValueOnce({ products: [{ id: 'sp1' }], pagination: { hasNext: true } })
        .mockResolvedValueOnce({ products: [{ id: 'sp2' }, { id: 'sp3' }], pagination: { hasNext: false } });

      const result = await service.syncShopeeProducts('sp-store', 't1');
      expect(result).toBe(3);
      expect(mockShopeeClient.getProducts).toHaveBeenCalledTimes(2);
    });

    it('syncs Shopee orders with since parameter', async () => {
      selectQueue.push([{ id: 'sp-store', tenantId: 't1', configJson: encryptedEmptyConfig }]);
      mockShopeeClient.getOrders.mockResolvedValue({
        orders: [{ orderSn: 'so1' }], pagination: { hasMore: false },
      });

      const result = await service.syncShopeeOrders('sp-store', 't1', '2025-01-01');
      expect(result).toBe(1);
      expect(mockShopeeClient.getOrders).toHaveBeenCalledWith('2025-01-01', 1, 50);
    });

    it('syncs eBay products and orders', async () => {
      selectQueue.push(
        [{ id: 'eb-store', tenantId: 't1', configJson: encryptedEmptyConfig }],
        [{ id: 'eb-store', tenantId: 't1', configJson: encryptedEmptyConfig }],
      );
      mockEbayClient.getProducts.mockResolvedValue([{ itemId: 'eb1' }]);
      mockEbayClient.getOrders.mockResolvedValue([{ orderId: 'eo1' }]);

      const prodResult = await service.syncEbayProducts('eb-store', 't1');
      expect(prodResult).toBe(1);

      const ordResult = await service.syncEbayOrders('eb-store', 't1');
      expect(ordResult).toBe(1);
    });
  });
});
