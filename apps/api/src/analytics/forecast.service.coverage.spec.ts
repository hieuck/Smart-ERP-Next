const mockDb = {
  select: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  orders: { id: 'orders.id', tenantId: 'orders.tenantId', createdAt: 'orders.createdAt', status: 'orders.status' },
  orderItems: { orderId: 'orderItems.orderId', productId: 'orderItems.productId', quantity: 'orderItems.quantity' },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  gte: jest.fn((field, value) => ({ op: 'gte', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
}));

import { ForecastService } from './forecast.service';

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    innerJoin: jest.fn(() => chain),
    where: jest.fn(() => chain),
    groupBy: jest.fn(() => chain),
    orderBy: jest.fn(() => Promise.resolve(rows)),
  };
  return chain;
};

describe('ForecastService coverage', () => {
  let service: ForecastService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    service = new ForecastService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('falls back to average demand when there is limited sales history', async () => {
    mockDb.select.mockReturnValueOnce(makeSelectChain([{ quantity: '2' }, { quantity: '4' }]));

    await expect(service.getDemandForecast('tenant-1', 'product-1', 3)).resolves.toEqual({
      forecast: [3, 3, 3],
      reorderRecommendation: null,
    });
  });

  it('uses exponential smoothing and recent demand for reorder recommendations', async () => {
    mockDb.select.mockReturnValueOnce(makeSelectChain([
      { quantity: '1' },
      { quantity: '2' },
      { quantity: '3' },
      { quantity: '4' },
      { quantity: '5' },
      { quantity: '6' },
      { quantity: '7' },
    ]));

    await expect(service.getDemandForecast('tenant-1', 'product-1', 2)).resolves.toEqual({
      forecast: [7, 7],
      reorderRecommendation: 28,
    });

    mockDb.select.mockReturnValueOnce(makeSelectChain(Array.from({ length: 7 }, () => ({ quantity: '0' }))));
    await expect(service.getDemandForecast('tenant-1', 'product-1')).resolves.toEqual({
      forecast: Array.from({ length: 30 }, () => 0),
      reorderRecommendation: null,
    });
  });
});
