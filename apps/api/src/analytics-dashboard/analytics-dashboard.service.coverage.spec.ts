jest.mock('drizzle-orm', () => ({
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { AnalyticsDashboardService } from './analytics-dashboard.service';

describe('AnalyticsDashboardService coverage', () => {
  const db = { execute: jest.fn() };
  let service: AnalyticsDashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T03:00:00.000Z'));
    service = new AnalyticsDashboardService({ db } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const queueKpiRows = (current: any, previous: any, quality: any = { total: 5, passed: 4 }) => {
    db.execute
      .mockResolvedValueOnce([current])
      .mockResolvedValueOnce([previous])
      .mockResolvedValueOnce([{ total: 12 }])
      .mockResolvedValueOnce([{ total: 4 }])
      .mockResolvedValueOnce([{ total: 3 }])
      .mockResolvedValueOnce([quality]);
  };

  it('computes KPI totals, averages, pass rate, and period comparison', async () => {
    queueKpiRows({ revenue: 2000, orders: 4 }, { revenue: 1000, orders: 2 });

    await expect(service.getKPIs('tenant-1', 'today')).resolves.toEqual({
      totalRevenue: 2000,
      totalOrders: 4,
      avgOrderValue: 500,
      totalCustomers: 12,
      lowStockCount: 4,
      productionInProgress: 3,
      qualityPassRate: 80,
      periodComparison: {
        revenueChange: 100,
        ordersChange: 100,
        customersChange: 0,
      },
    });
  });

  it('covers week, month, and quarter date branches and zero-division fallbacks', async () => {
    queueKpiRows({ revenue: 0, orders: 0 }, { revenue: 0, orders: 0 }, { total: 0, passed: 0 });
    await expect(service.getKPIs('tenant-1', 'week')).resolves.toMatchObject({
      avgOrderValue: 0,
      qualityPassRate: 0,
      periodComparison: { revenueChange: 0, ordersChange: 0 },
    });

    db.execute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    await expect(service.getKPIs('tenant-1')).resolves.toMatchObject({
      totalRevenue: 0,
      totalOrders: 0,
    });

    queueKpiRows({ revenue: 900, orders: 3 }, { revenue: 300, orders: 1 });
    await expect(service.getKPIs('tenant-1', 'quarter')).resolves.toMatchObject({
      totalRevenue: 900,
      totalOrders: 3,
      periodComparison: { revenueChange: 200, ordersChange: 200 },
    });
  });

  it('delegates chart and top product queries', async () => {
    db.execute
      .mockResolvedValueOnce([{ date: '2026-05-21', revenue: 1000, orders: 2 }])
      .mockResolvedValueOnce([{ id: 'product-1', total_sold: 3 }])
      .mockResolvedValueOnce([{ date: '2026-05-20', revenue: 500, orders: 1 }])
      .mockResolvedValueOnce([{ id: 'product-2', total_sold: 1 }]);

    await expect(service.getRevenueChart('tenant-1', 7)).resolves.toEqual([
      { date: '2026-05-21', revenue: 1000, orders: 2 },
    ]);
    await expect(service.getTopProducts('tenant-1', 5)).resolves.toEqual([
      { id: 'product-1', total_sold: 3 },
    ]);
    await expect(service.getRevenueChart('tenant-1')).resolves.toEqual([
      { date: '2026-05-20', revenue: 500, orders: 1 },
    ]);
    await expect(service.getTopProducts('tenant-1')).resolves.toEqual([
      { id: 'product-2', total_sold: 1 },
    ]);
  });

  it('detects critical, warning, and inventory/quality/production insights', async () => {
    db.execute
      .mockResolvedValueOnce([
        ...Array.from({ length: 13 }, (_, index) => ({ daily_revenue: index === 12 ? 10 : 1000 })),
        { daily_revenue: 10 },
      ])
      .mockResolvedValueOnce([{ count: 11 }])
      .mockResolvedValueOnce([{ total: 10, failed: 3 }])
      .mockResolvedValueOnce([{ count: 2 }]);

    await expect(service.getAIInsights('tenant-1')).resolves.toEqual([
      expect.objectContaining({ type: 'anomaly', severity: 'critical', metric: 'revenue' }),
      expect.objectContaining({ type: 'inventory', severity: 'critical', value: 11 }),
      expect.objectContaining({ type: 'quality', severity: 'critical', metric: 'qualityFailRate', value: 30 }),
      expect.objectContaining({ type: 'production', severity: 'warning', value: 2 }),
    ]);
  });

  it('handles revenue spike, soft warnings, and no-data insight fallbacks', async () => {
    db.execute
      .mockResolvedValueOnce([
        ...Array.from({ length: 13 }, () => ({ daily_revenue: 100 })),
        { daily_revenue: 1000 },
      ])
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ total: 10, failed: 2 }])
      .mockResolvedValueOnce([{ count: 0 }]);

    await expect(service.getAIInsights('tenant-1')).resolves.toEqual([
      expect.objectContaining({ type: 'trend', severity: 'info', metric: 'revenue' }),
      expect.objectContaining({ type: 'inventory', severity: 'warning', value: 2 }),
      expect.objectContaining({ type: 'quality', severity: 'warning', value: 20 }),
    ]);

    db.execute
      .mockResolvedValueOnce([{ daily_revenue: 100 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 0 }]);
    await expect(service.getAIInsights('tenant-1')).resolves.toEqual([]);
  });

  it('detects a softer revenue warning without crossing the critical threshold', async () => {
    db.execute
      .mockResolvedValueOnce([
        ...[80, 90, 100, 110, 120, 80, 90, 100, 110, 120, 80, 90, 100].map((daily_revenue) => ({ daily_revenue })),
        { daily_revenue: 70 },
      ])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ total: 10, failed: 0 }])
      .mockResolvedValueOnce([{ count: 0 }]);

    await expect(service.getAIInsights('tenant-1')).resolves.toEqual([
      expect.objectContaining({ type: 'anomaly', severity: 'warning', metric: 'revenue' }),
    ]);

    db.execute
      .mockResolvedValueOnce([
        ...Array.from({ length: 13 }, () => ({ daily_revenue: 0 })),
        { daily_revenue: null },
      ])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ total: 0, failed: 0 }])
      .mockResolvedValueOnce([{ count: 0 }]);

    await expect(service.getAIInsights('tenant-1')).resolves.toEqual([]);
  });
});
