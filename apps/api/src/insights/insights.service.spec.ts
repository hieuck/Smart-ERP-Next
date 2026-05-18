jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  gte: jest.fn(),
  sql: jest.fn().mockReturnValue('SQL_EXPR'),
  desc: jest.fn(),
}));

jest.mock('@smart-erp/database', () => {
  // Create a chainable mock that also acts as a Promise (thenable)
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
    // Make it thenable so `await db.select()...where()` resolves to result
    chain.then = (resolve: any) => Promise.resolve(result).then(resolve);
    chain.catch = (reject: any) => Promise.resolve(result).catch(reject);
    return chain;
  }

  const countResult = [{ customerCount: 0, lowStockCount: 0 }];
  const emptyResult: any[] = [];

  return {
    db: {
      select: jest.fn().mockImplementation((arg?: any) => {
        if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
          const keys = Object.keys(arg);
          if (keys.length > 0 && (keys[0] === 'customerCount' || keys[0] === 'lowStockCount')) {
            return createChain(countResult);
          }
        }
        return createChain(emptyResult);
      }),
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    },
  };
});

jest.mock('@smart-erp/database/schema', () => ({
  orders: { tenantId: 'tenantId', createdAt: 'createdAt', total: 'total', id: 'id', code: 'code', status: 'status' },
  products: { tenantId: 'tenantId', isActive: 'isActive', stock: 'stock', minStock: 'min_stock' },
  customers: { tenantId: 'tenantId' },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { InsightsService } from './insights.service';

describe('InsightsService', () => {
  let service: InsightsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InsightsService],
    }).compile();

    service = module.get<InsightsService>(InsightsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardInsights', () => {
    it('should generate insights structure for tenant', async () => {
      const result = await service.getDashboardInsights('tenant-123');
      expect(result).toHaveProperty('todayRevenue');
      expect(result).toHaveProperty('todayOrders');
      expect(result).toHaveProperty('totalCustomers');
      expect(result).toHaveProperty('lowStockCount');
      expect(result).toHaveProperty('insights');
      expect(Array.isArray(result.insights)).toBe(true);
    });
  });
});
