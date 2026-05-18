jest.mock('@smart-erp/database', () => {
  // Create a chainable+thenable mock for drizzle queries
  function createChain(result: any[]) {
    const chain: any = {};
    chain.from = () => chain;
    chain.where = () => chain;
    chain.and = () => chain;
    chain.gte = () => chain;
    chain.eq = () => chain;
    chain.sql = () => chain;
    chain.desc = () => chain;
    chain.orderBy = () => chain;
    chain.limit = () => chain;
    chain.set = () => chain;
    chain.returning = () => chain;
    chain.values = () => chain;
    chain.update = () => chain;
    chain.insert = () => chain;
    chain.then = (resolve: any) => Promise.resolve(result).then(resolve);
    chain.catch = (reject: any) => Promise.resolve(result).catch(reject);
    return chain;
  }

  return {
    db: {
      select: jest.fn().mockImplementation(() => createChain([])),
      insert: jest.fn().mockImplementation(() => createChain([])),
      update: jest.fn().mockImplementation(() => createChain([])),
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    },
  };
});

jest.mock('@smart-erp/database/schema', () => ({
  ecommerceStores: { id: 'id', tenantId: 'tenantId', isActive: 'isActive', platform: 'platform', configJson: 'configJson', lastSyncAt: 'lastSyncAt', lastSyncStatus: 'lastSyncStatus', createdAt: 'createdAt' },
  ecommerceSyncLogs: { id: 'id', storeId: 'storeId', tenantId: 'tenantId', syncType: 'syncType', status: 'status', itemsProcessed: 'itemsProcessed', errorMessage: 'errorMessage', startedAt: 'startedAt', completedAt: 'completedAt', createdAt: 'createdAt' },
  ecommerceChannelInventory: { id: 'id', storeId: 'storeId', lastSyncedAt: 'lastSyncedAt' },
  products: { id: 'id', tenantId: 'tenantId', externalId: 'externalId', name: 'name', sku: 'sku', price: 'price', stock: 'stock', description: 'description', images: 'images', isActive: 'isActive', externalPlatform: 'externalPlatform' },
  orders: { id: 'id', tenantId: 'tenantId', externalId: 'externalId', code: 'code', customerName: 'customerName', customerPhone: 'customerPhone', total: 'total', status: 'status', channel: 'channel', externalPlatform: 'externalPlatform' },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { EcommerceService } from './ecommerce.service';
import { ShopeeClient } from './shopee.client';

describe('EcommerceService', () => {
  let service: EcommerceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EcommerceService,
        {
          provide: ShopeeClient,
          useValue: {
            getProducts: jest.fn(),
            getOrders: jest.fn(),
            getProductDetail: jest.fn(),
            getOrderDetail: jest.fn(),
            updateStock: jest.fn(),
            batchUpdateStock: jest.fn(),
            refreshAccessToken: jest.fn(),
            verifyWebhook: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EcommerceService>(EcommerceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncAllStores', () => {
    it('should return empty array when no stores found', async () => {
      const result = await service.syncAllStores('tenant-123');
      expect(result).toEqual([]);
    });
  });

  describe('syncStoreProductsAndOrders', () => {
    it('should return partial success when some operations fail', async () => {
      const store = {
        id: 'store-1',
        tenantId: 'tenant-123',
        platform: 'shopee',
        isActive: true,
        configJson: '{}',
      };
      const result = await service.syncStoreProductsAndOrders(store);
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('itemsProcessed');
    });
  });
});
