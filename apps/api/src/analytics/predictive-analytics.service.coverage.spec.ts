jest.mock('@smart-erp/database', () => ({
  customers: {},
  orders: {},
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  sql: Object.assign(
    jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
    { raw: jest.fn((value) => ({ op: 'raw', value })) },
  ),
}));

import { PredictiveAnalyticsService } from './predictive-analytics.service';

describe('PredictiveAnalyticsService coverage', () => {
  const drizzle = {
    db: {
      execute: jest.fn(),
    },
  };
  let service: PredictiveAnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PredictiveAnalyticsService(drizzle as any);
  });

  it('calculates CLV scores and churn risk from customer stats', async () => {
    drizzle.db.execute.mockResolvedValueOnce({
      rows: [
        { customer_id: 'c1', customer_name: 'VIP', total_revenue: 1000, order_count: 4, avg_order_value: 250 },
        { customer_id: 'c2', customer_name: 'Medium', total_revenue: 500, order_count: 2, avg_order_value: 250 },
        { customer_id: 'c3', customer_name: 'Risk', total_revenue: 0, order_count: 1, avg_order_value: 0 },
      ],
    });

    await expect(service.calculateCLVScores('tenant-1')).resolves.toEqual([
      { customerId: 'c1', customerName: 'VIP', totalRevenue: 1000, orderCount: 4, avgOrderValue: 250, clvScore: 100, churnRisk: 'low' },
      { customerId: 'c2', customerName: 'Medium', totalRevenue: 500, orderCount: 2, avgOrderValue: 250, clvScore: 50, churnRisk: 'medium' },
      { customerId: 'c3', customerName: 'Risk', totalRevenue: 0, orderCount: 1, avgOrderValue: 0, clvScore: 0, churnRisk: 'high' },
    ]);
  });

  it('calculates weekly growth and filters at-risk customers', async () => {
    drizzle.db.execute
      .mockResolvedValueOnce({
        rows: [
          { period: 'w1', revenue: 100, orders_count: 2 },
          { period: 'w2', revenue: 150, orders_count: 3 },
          { period: 'w3', revenue: 0, orders_count: 0 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { customer_id: 'c1', customer_name: 'Low', total_revenue: 100, order_count: 5, avg_order_value: 20 },
          { customer_id: 'c2', customer_name: 'Medium', total_revenue: 50, order_count: 3, avg_order_value: 16.6 },
          { customer_id: 'c3', customer_name: 'High', total_revenue: 10, order_count: 1, avg_order_value: 10 },
        ],
      });

    await expect(service.getSalesTrend('tenant-1', 3)).resolves.toEqual([
      { period: 'w1', revenue: 100, ordersCount: 2, growthRate: 0 },
      { period: 'w2', revenue: 150, ordersCount: 3, growthRate: 50 },
      { period: 'w3', revenue: 0, ordersCount: 0, growthRate: -100 },
    ]);
    await expect(service.getAtRiskCustomers('tenant-1')).resolves.toEqual([
      expect.objectContaining({ customerId: 'c2', churnRisk: 'medium' }),
      expect.objectContaining({ customerId: 'c3', churnRisk: 'high' }),
    ]);
  });

  it('uses default sales-trend weeks and previous revenue fallbacks', async () => {
    drizzle.db.execute.mockResolvedValueOnce({
      rows: [
        { period: 'w1', revenue: undefined, orders_count: 1 },
        { period: 'w2', revenue: 10, orders_count: 2 },
      ],
    });

    await expect(service.getSalesTrend('tenant-1')).resolves.toEqual([
      { period: 'w1', revenue: NaN, ordersCount: 1, growthRate: 0 },
      { period: 'w2', revenue: 10, ordersCount: 2, growthRate: 1000 },
    ]);
  });
});
