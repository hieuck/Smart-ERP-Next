const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

const mockTikTokClient = { getProducts: jest.fn(), getOrders: jest.fn() };
const mockAmazonClient = { listProducts: jest.fn(), listOrders: jest.fn() };
const mockEbayClient = { listProducts: jest.fn(), listOrders: jest.fn() };
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

jest.mock('./tiktokshop.client', () => ({
  TikTokShopClient: jest.fn(() => mockTikTokClient),
}));
jest.mock('./amazon.client', () => ({
  AmazonClient: jest.fn(() => mockAmazonClient),
}));
jest.mock('./ebay.client', () => ({
  EbayClient: jest.fn(() => mockEbayClient),
}));
jest.mock('./shopee.client', () => ({
  ShopeeClient: jest.fn(() => mockShopeeClient),
}));

import { HttpException } from '@nestjs/common';
import { EcommerceService } from './ecommerce.service';

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

describe('EcommerceService coverage', () => {
  let service: EcommerceService;

  beforeEach(() => {
    jest.clearAllMocks();
    selectQueue.length = 0;
    insertReturningQueue.length = 0;
    service = new EcommerceService();

    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain(insertReturningQueue));
    mockDb.update.mockImplementation(() => makeWriteChain([]));
  });

  it('syncs all active stores and records per-store failures', async () => {
    selectQueue.push([
      { id: 'store-1', platform: 'shopee' },
      { id: 'store-2', platform: 'amazon' },
    ]);
    jest
      .spyOn(service, 'syncStoreProductsAndOrders')
      .mockResolvedValueOnce({ storeId: 'store-1', status: 'success' } as any)
      .mockRejectedValueOnce(new Error('network down'))
      .mockRejectedValueOnce('raw sync down');

    await expect(service.syncAllStores('tenant-1', 'store-1')).resolves.toEqual([
      { storeId: 'store-1', status: 'success' },
      expect.objectContaining({
        storeId: 'store-2',
        platform: 'amazon',
        status: 'failed',
        errors: ['network down'],
      }),
    ]);

    selectQueue.push([{ id: 'store-3', platform: 'shopee' }]);
    await expect(service.syncAllStores('tenant-1')).resolves.toEqual([
      expect.objectContaining({ errors: ['raw sync down'], status: 'failed' }),
    ]);
  });

  it('summarizes product, inventory, and order sync into a sync log', async () => {
    jest.spyOn(service as any, 'syncStoreProducts').mockResolvedValue(2);
    jest.spyOn(service as any, 'syncStoreInventory').mockRejectedValue(new Error('inventory API failed'));
    jest.spyOn(service as any, 'syncStoreOrders').mockResolvedValue(1);

    await expect(
      service.syncStoreProductsAndOrders({ id: 'store-1', tenantId: 'tenant-1', platform: 'shopee' }),
    ).resolves.toMatchObject({
      storeId: 'store-1',
      platform: 'shopee',
      status: 'partial',
      itemsProcessed: { products: 2, orders: 1, inventory: 0 },
      errors: ['[Inventory] inventory API failed'],
    });

    expect(mockDb.insert.mock.results[0].value.values).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: 'store-1',
        tenantId: 'tenant-1',
        syncType: 'all',
        status: 'partial',
        errorMessage: '[Inventory] inventory API failed',
      }),
    );
    expect(mockDb.update.mock.results[0].value.set).toHaveBeenCalledWith(
      expect.objectContaining({ lastSyncStatus: 'partial' }),
    );
  });

  it('records failed product and order phases and normalizes empty inventory results', async () => {
    jest.spyOn(service as any, 'syncStoreProducts').mockRejectedValue(new Error('product API failed'));
    jest.spyOn(service as any, 'syncStoreInventory').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'syncStoreOrders').mockRejectedValue(new Error('order API failed'));

    await expect(
      service.syncStoreProductsAndOrders({ id: 'store-1', tenantId: 'tenant-1', platform: 'shopee' }),
    ).resolves.toMatchObject({
      status: 'failed',
      itemsProcessed: { products: 0, orders: 0, inventory: 0 },
      errors: ['[Products] product API failed', '[Orders] order API failed'],
    });
  });

  it('records fully successful empty syncs and raw string errors', async () => {
    jest.spyOn(service as any, 'syncStoreProducts').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'syncStoreInventory').mockResolvedValue(0);
    jest.spyOn(service as any, 'syncStoreOrders').mockResolvedValue(undefined);

    await expect(
      service.syncStoreProductsAndOrders({ id: 'store-success', tenantId: 'tenant-1', platform: 'amazon' }),
    ).resolves.toMatchObject({
      status: 'success',
      itemsProcessed: { products: 0, orders: 0, inventory: 0 },
      errors: [],
    });
    expect(mockDb.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({
      errorMessage: null,
    }));

    jest.spyOn(service as any, 'syncStoreProducts').mockRejectedValueOnce('raw product error');
    jest.spyOn(service as any, 'syncStoreInventory').mockResolvedValueOnce(0);
    jest.spyOn(service as any, 'syncStoreOrders').mockResolvedValueOnce(0);
    await expect(
      service.syncStoreProductsAndOrders({ id: 'store-raw-error', tenantId: 'tenant-1', platform: 'amazon' }),
    ).resolves.toMatchObject({
      status: 'failed',
      errors: ['[Products] raw product error'],
    });

    jest.spyOn(service as any, 'syncStoreProducts').mockResolvedValueOnce(1);
    jest.spyOn(service as any, 'syncStoreInventory').mockRejectedValueOnce('raw inventory error');
    jest.spyOn(service as any, 'syncStoreOrders').mockRejectedValueOnce('raw order error');
    await expect(
      service.syncStoreProductsAndOrders({ id: 'store-raw-errors', tenantId: 'tenant-1', platform: 'amazon' }),
    ).resolves.toMatchObject({
      status: 'partial',
      errors: ['[Inventory] raw inventory error', '[Orders] raw order error'],
    });
  });

  it('dispatches platform-specific sync methods and rejects unsupported platforms', async () => {
    jest.spyOn(service, 'syncTikTokShopProducts').mockResolvedValue(1);
    jest.spyOn(service, 'syncAmazonProducts').mockResolvedValue(2);
    jest.spyOn(service, 'syncEbayProducts').mockResolvedValue(5);
    jest.spyOn(service, 'syncShopeeProducts').mockResolvedValue(6);
    jest.spyOn(service, 'syncTikTokShopOrders').mockResolvedValue(7);
    jest.spyOn(service, 'syncAmazonOrders').mockResolvedValue(8);
    jest.spyOn(service, 'syncEbayOrders').mockResolvedValue(3);
    jest.spyOn(service, 'syncShopeeOrders').mockResolvedValue(4);

    selectQueue.push(
      [{ id: 's1', platform: 'tiktokshop' }],
      [{ id: 's2', platform: 'amazon' }],
      [{ id: 's3', platform: 'ebay' }],
      [{ id: 's4', platform: 'shopee' }],
      [{ id: 's5', platform: 'tiktokshop' }],
      [{ id: 's6', platform: 'amazon' }],
      [{ id: 's7', platform: 'ebay' }],
      [{ id: 's8', platform: 'shopee' }],
      [{ id: 's9', platform: 'unknown' }],
      [{ id: 's10', platform: 'unknown' }],
    );

    await expect((service as any).syncStoreProducts('s1')).resolves.toBe(1);
    await expect((service as any).syncStoreProducts('s2')).resolves.toBe(2);
    await expect((service as any).syncStoreProducts('s3')).resolves.toBe(5);
    await expect((service as any).syncStoreProducts('s4')).resolves.toBe(6);
    await expect((service as any).syncStoreOrders('s5')).resolves.toBe(7);
    await expect((service as any).syncStoreOrders('s6')).resolves.toBe(8);
    await expect((service as any).syncStoreOrders('s7')).resolves.toBe(3);
    await expect((service as any).syncStoreOrders('s8')).resolves.toBe(4);
    await expect((service as any).syncStoreProducts('s9')).rejects.toBeInstanceOf(HttpException);
    await expect((service as any).syncStoreOrders('s10')).rejects.toBeInstanceOf(HttpException);
  });

  it('syncs marketplace products and orders through API clients', async () => {
    jest.spyOn(service as any, 'upsertProductFromTikTok').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'upsertOrderFromTikTok').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'upsertProductFromAmazon').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'upsertOrderFromAmazon').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'upsertProductFromEbay').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'upsertOrderFromEbay').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'upsertProductFromShopee').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'upsertOrderFromShopee').mockResolvedValue(undefined);

    selectQueue.push(
      [{ id: 'tiktok', tenantId: 'tenant-1', configJson: '{}' }],
      [{ id: 'tiktok', tenantId: 'tenant-1', configJson: '{}' }],
      [{ id: 'amazon', tenantId: 'tenant-1', configJson: '{}' }],
      [{ id: 'amazon', tenantId: 'tenant-1', configJson: '{}' }],
      [{ id: 'ebay', tenantId: 'tenant-1', configJson: '{}' }],
      [{ id: 'ebay', tenantId: 'tenant-1', configJson: '{}' }],
      [{ id: 'shopee', tenantId: 'tenant-1', configJson: '{}' }],
      [{ id: 'shopee', tenantId: 'tenant-1', configJson: '{}' }],
    );
    mockTikTokClient.getProducts
      .mockResolvedValueOnce({ products: [{ id: 'tp-1' }], pagination: { has_more: true } })
      .mockResolvedValueOnce({ products: [{ id: 'tp-2' }], pagination: { has_more: false } });
    mockTikTokClient.getOrders.mockResolvedValue({ orders: [{ order_id: 'to-1' }], pagination: { has_more: false } });
    mockAmazonClient.listProducts.mockResolvedValue({ products: [{ asin: 'a-1' }] });
    mockAmazonClient.listOrders.mockResolvedValue({ orders: [{ AmazonOrderId: 'ao-1' }] });
    mockEbayClient.listProducts.mockResolvedValue({ products: [{ itemId: 'e-1' }] });
    mockEbayClient.listOrders.mockResolvedValue({ orders: [{ orderId: 'eo-1' }] });
    mockShopeeClient.getProducts.mockResolvedValue({ products: [{ id: 's-1' }], pagination: { hasNext: false } });
    mockShopeeClient.getOrders.mockResolvedValue({ orders: [{ orderSn: 'so-1' }], pagination: { hasMore: false } });

    await expect(service.syncTikTokShopProducts('tiktok')).resolves.toBe(2);
    await expect(service.syncTikTokShopOrders('tiktok')).resolves.toBe(1);
    await expect(service.syncAmazonProducts('amazon')).resolves.toBe(1);
    await expect(service.syncAmazonOrders('amazon')).resolves.toBe(1);
    await expect(service.syncEbayProducts('ebay')).resolves.toBe(1);
    await expect(service.syncEbayOrders('ebay')).resolves.toBe(1);
    await expect(service.syncShopeeProducts('shopee')).resolves.toBe(1);
    await expect(service.syncShopeeOrders('shopee')).resolves.toBe(1);
  });

  it('uses empty marketplace configs when store config JSON is missing', async () => {
    jest.spyOn(service as any, 'upsertProductFromTikTok').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'upsertOrderFromTikTok').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'upsertProductFromAmazon').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'upsertOrderFromAmazon').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'upsertProductFromEbay').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'upsertOrderFromEbay').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'upsertProductFromShopee').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'upsertOrderFromShopee').mockResolvedValue(undefined);

    selectQueue.push(
      [{ id: 'tiktok-null', tenantId: 'tenant-1', configJson: null }],
      [{ id: 'tiktok-null', tenantId: 'tenant-1', configJson: null }],
      [{ id: 'amazon-null', tenantId: 'tenant-1', configJson: null }],
      [{ id: 'amazon-null', tenantId: 'tenant-1', configJson: null }],
      [{ id: 'ebay-null', tenantId: 'tenant-1', configJson: null }],
      [{ id: 'ebay-null', tenantId: 'tenant-1', configJson: null }],
      [{ id: 'shopee-null', tenantId: 'tenant-1', configJson: null }],
      [{ id: 'shopee-null', tenantId: 'tenant-1', configJson: null }],
    );
    mockTikTokClient.getProducts.mockResolvedValueOnce({ products: [], pagination: { has_more: false } });
    mockTikTokClient.getOrders.mockResolvedValueOnce({ orders: [], pagination: { has_more: false } });
    mockAmazonClient.listProducts.mockResolvedValueOnce({ products: [] });
    mockAmazonClient.listOrders.mockResolvedValueOnce({ orders: [] });
    mockEbayClient.listProducts.mockResolvedValueOnce({ products: [] });
    mockEbayClient.listOrders.mockResolvedValueOnce({ orders: [] });
    mockShopeeClient.getProducts.mockResolvedValueOnce({ products: [], pagination: { hasNext: false } });
    mockShopeeClient.getOrders.mockResolvedValueOnce({ orders: [], pagination: { hasMore: false } });

    await expect(service.syncTikTokShopProducts('tiktok-null')).resolves.toBe(0);
    await expect(service.syncTikTokShopOrders('tiktok-null')).resolves.toBe(0);
    await expect(service.syncAmazonProducts('amazon-null')).resolves.toBe(0);
    await expect(service.syncAmazonOrders('amazon-null')).resolves.toBe(0);
    await expect(service.syncEbayProducts('ebay-null')).resolves.toBe(0);
    await expect(service.syncEbayOrders('ebay-null')).resolves.toBe(0);
    await expect(service.syncShopeeProducts('shopee-null')).resolves.toBe(0);
    await expect(service.syncShopeeOrders('shopee-null')).resolves.toBe(0);
  });

  it('syncs channel inventory and exposes store/log management APIs', async () => {
    selectQueue.push(
      [{ id: 'store-1' }],
      [{ id: 'inv-1' }, { id: 'inv-2' }],
      [{ id: 'store-1' }],
      [{ id: 'log-1' }],
    );
    insertReturningQueue.push([{ id: 'new-store' }]);

    await expect((service as any).syncStoreInventory('store-1')).resolves.toBe(2);
    await expect(service.getStores('tenant-1')).resolves.toEqual([{ id: 'store-1' }]);
    await expect(service.createStore('tenant-1', { platform: 'shopee', name: 'Shopee', configJson: '{}' })).resolves.toEqual({
      id: 'new-store',
    });
    await expect(service.getSyncLogs('tenant-1', 'store-1')).resolves.toEqual([{ id: 'log-1' }]);

    selectQueue.push([{ id: 'log-all' }]);
    await expect(service.getSyncLogs('tenant-1')).resolves.toEqual([{ id: 'log-all' }]);
  });

  it('upserts products and orders from marketplace payloads', async () => {
    selectQueue.push(
      [],
      [{ id: 'existing-product' }],
      [],
      [],
      [{ id: 'existing-order' }],
      [],
      [],
      [],
    );

    await (service as any).upsertProductFromTikTok('tenant-1', {
      id: 'tp-1',
      title: 'TikTok SKU',
      price: '15000',
      quantity: 7,
      images: ['img'],
    });
    await (service as any).upsertProductFromAmazon('tenant-1', {
      asin: 'asin-1',
      title: 'Amazon SKU',
      seller_sku: 'AMZ-1',
      price: { Amount: '12.5' },
      quantity: '4',
    });
    await (service as any).upsertProductFromEbay('tenant-1', { itemId: 'ebay-1', title: 'eBay SKU' });
    await (service as any).upsertProductFromShopee('tenant-1', { id: 'shopee-1', name: 'Shopee SKU', status: 'active' });
    await (service as any).upsertOrderFromTikTok('tenant-1', {
      order_id: 'to-1',
      buyer_name: 'Buyer',
      total_amount: '10',
      order_status: 'PAID',
    });
    await (service as any).upsertOrderFromAmazon('tenant-1', {
      AmazonOrderId: 'ao-1',
      BuyerName: 'Amazon Buyer',
      OrderTotal: { Amount: '20' },
      OrderStatus: 'Shipped',
    });
    await (service as any).upsertOrderFromAmazon('tenant-1', {
      AmazonOrderId: 'ao-empty',
      BuyerName: 'Amazon Empty',
      OrderStatus: 'Pending',
    });
    await (service as any).upsertOrderFromEbay('tenant-1', {
      orderId: 'eo-1',
      buyer: { username: 'ebay-buyer' },
      total: { value: '30' },
      orderStatus: 'COMPLETED',
    });
    await (service as any).upsertOrderFromShopee('tenant-1', {
      orderSn: 'so-1',
      buyerName: 'Shopee Buyer',
      totalAmount: 40,
      status: 'confirmed',
    });
    await (service as any).upsertOrderFromShopee('tenant-1', {
      orderSn: 'so-empty',
      status: 'pending',
    });
    await (service as any).upsertOrderFromEbay('tenant-1', {
      orderId: 'eo-empty',
      orderStatus: 'PAID',
    });

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('covers marketplace product update and insert branches for all platforms', async () => {
    selectQueue.push(
      [{ id: 'tiktok-existing' }],
      [],
      [{ id: 'amazon-existing' }],
      [],
      [{ id: 'ebay-existing' }],
      [],
      [{ id: 'shopee-existing' }],
      [],
    );

    await (service as any).upsertProductFromTikTok('tenant-1', {
      id: 'tp-existing',
      title: 'TikTok Existing',
      price: '15000',
      quantity: 7,
    });
    await (service as any).upsertProductFromTikTok('tenant-1', {
      id: 'tp-new',
      title: 'TikTok New',
      price: '16000',
      quantity: 8,
    });
    await (service as any).upsertProductFromAmazon('tenant-1', {
      asin: 'asin-existing',
      title: 'Amazon Existing',
    });
    await (service as any).upsertProductFromAmazon('tenant-1', {
      asin: 'asin-new',
      title: 'Amazon New',
    });
    await (service as any).upsertProductFromEbay('tenant-1', {
      itemId: 'ebay-existing',
      title: 'eBay Existing',
    });
    await (service as any).upsertProductFromEbay('tenant-1', {
      itemId: 'ebay-new',
      title: 'eBay New',
    });
    await (service as any).upsertProductFromShopee('tenant-1', {
      id: 'shopee-existing',
      name: 'Shopee Existing',
    });
    await (service as any).upsertProductFromShopee('tenant-1', {
      id: 'shopee-new',
      name: 'Shopee New',
    });

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('maps marketplace statuses and rejects missing stores', async () => {
    expect((service as any).mapTikTokStatus('PAID')).toBe('confirmed');
    expect((service as any).mapTikTokStatus('UNKNOWN')).toBe('pending');
    expect((service as any).mapAmazonStatus('Canceled')).toBe('cancelled');
    expect((service as any).mapAmazonStatus('UNKNOWN')).toBe('pending');
    await expect((service as any).mapEbayStatus('COMPLETED')).resolves.toBe('delivered');
    await expect((service as any).mapEbayStatus('UNKNOWN')).resolves.toBe('pending');

    selectQueue.push([]);
    await expect((service as any).getStore('missing')).rejects.toBeInstanceOf(HttpException);
  });
});
