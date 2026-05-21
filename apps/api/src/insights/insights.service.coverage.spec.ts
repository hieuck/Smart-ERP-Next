const mockDb = {
  select: jest.fn(),
  execute: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  orders: {
    tenantId: 'orders.tenantId',
    createdAt: 'orders.createdAt',
  },
  products: {
    tenantId: 'products.tenantId',
    isActive: 'products.isActive',
  },
  customers: {
    tenantId: 'customers.tenantId',
  },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  gte: jest.fn((field, value) => ({ op: 'gte', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
}));

import { InsightsService } from './insights.service';

const selectQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('InsightsService coverage', () => {
  let service: InsightsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T03:00:00.000Z'));
    selectQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.execute.mockResolvedValue({ rows: [] });
    service = new InsightsService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const queueDashboardSelects = (
    todayOrders: any[],
    yesterdayOrders: any[],
    lowStockCount: number,
    weeklyOrders: any[],
    historicalOrders: any[],
  ) => {
    selectQueue.push(
      todayOrders,
      yesterdayOrders,
      [{ customerCount: 3 }],
      [{ lowStockCount }],
      weeklyOrders,
      [{ id: 'order-1', code: 'SO-001', total: '150000', status: 'paid', createdAt: new Date('2026-05-21T02:00:00.000Z') }],
      historicalOrders,
    );
  };

  it('returns dashboard metrics with growth and low-stock insights', async () => {
    queueDashboardSelects(
      [{ total: '100000' }, { total: '50000' }],
      [{ total: '100000' }],
      2,
      [
        { total: '50000', createdAt: new Date('2026-05-20T02:00:00.000Z') },
        { total: '150000', createdAt: new Date('2026-05-21T02:00:00.000Z') },
      ],
      [
        { total: '100000', createdAt: new Date('2026-03-10T00:00:00.000Z') },
        { total: '200000', createdAt: new Date('2026-04-10T00:00:00.000Z') },
        { total: '300000', createdAt: new Date('2026-05-10T00:00:00.000Z') },
      ],
    );
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ product_id: 'p1', product_name: 'Ao thun', product_sku: 'SKU-1', sold: 4, revenue: '600000' }],
    });

    const result = await service.getDashboardInsights('tenant-1');

    expect(result.todayRevenue).toBe(150000);
    expect(result.todayOrders).toBe(2);
    expect(result.totalCustomers).toBe(3);
    expect(result.lowStockCount).toBe(2);
    expect(result.topProducts).toEqual([{ id: 'p1', name: 'Ao thun', sku: 'SKU-1', sold: 4, revenue: 600000 }]);
    expect(result.insights).toEqual([
      expect.objectContaining({ type: 'growth', severity: 'info' }),
      expect.objectContaining({ type: 'alert', severity: 'high' }),
    ]);
    expect(result.metrics).toMatchObject({
      todayRevenue: 150000,
      yesterdayRevenue: 100000,
      revenueTrend: 50,
      predictedNextMonth: 400000,
    });
  });

  it('returns warning and stable insights, and predicts zero with insufficient history', async () => {
    queueDashboardSelects(
      [{ total: '50000' }],
      [{ total: '100000' }],
      0,
      [],
      [{ total: '100000', createdAt: new Date('2026-05-10T00:00:00.000Z') }],
    );

    await expect(service.getDashboardInsights('tenant-1')).resolves.toMatchObject({
      todayRevenue: 50000,
      metrics: { yesterdayRevenue: 100000, revenueTrend: -50, predictedNextMonth: 0 },
      insights: [expect.objectContaining({ type: 'warning', severity: 'medium' })],
    });

    queueDashboardSelects(
      [{ total: '100000' }],
      [{ total: '100000' }],
      0,
      [],
      [],
    );

    await expect(service.getDashboardInsights('tenant-1')).resolves.toMatchObject({
      insights: [expect.objectContaining({ type: 'info', severity: 'low' })],
    });

    queueDashboardSelects(
      [{ total: '100000' }],
      [],
      0,
      [],
      [],
    );

    await expect(service.getDashboardInsights('tenant-1')).resolves.toMatchObject({
      metrics: { yesterdayRevenue: 0, revenueTrend: 0 },
      insights: [expect.objectContaining({ type: 'info', severity: 'low' })],
    });
  });

  it('predicts next month revenue with non-negative trend output', async () => {
    selectQueue.push([
      { total: '300000', createdAt: new Date('2026-03-10T00:00:00.000Z') },
      { total: '200000', createdAt: new Date('2026-04-10T00:00:00.000Z') },
      { total: '100000', createdAt: new Date('2026-05-10T00:00:00.000Z') },
    ]);

    await expect(service.predictNextMonthRevenue('tenant-1')).resolves.toBe(0);
  });
});
