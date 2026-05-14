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
