import { AnalyticsService } from './analytics.service';

describe('AnalyticsService coverage', () => {
  const drizzle = {
    db: {
      execute: jest.fn(),
    },
  };
  let service: AnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    service = new AnalyticsService(drizzle as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calculates dashboard KPIs with rounded trend changes', async () => {
    drizzle.db.execute
      .mockResolvedValueOnce([{ total: '1200' }])
      .mockResolvedValueOnce([{ total: '1000' }])
      .mockResolvedValueOnce([{ count: '6' }])
      .mockResolvedValueOnce([{ count: '10' }])
      .mockResolvedValueOnce([{ count: '4' }])
      .mockResolvedValueOnce([{ count: '2' }]);

    await expect(service.getKPIs('tenant-1')).resolves.toEqual([
      { label: 'Revenue', value: 1200, change: 20, trend: 'up', format: 'currency' },
      { label: 'Orders', value: 6, change: -40, trend: 'down', format: 'number' },
      { label: 'New Customers', value: 4, change: 100, trend: 'up', format: 'number' },
      { label: 'Avg Order Value', value: 200, change: 100, trend: 'up', format: 'currency' },
    ]);
  });

  it('uses neutral zero-change baselines when there is no previous activity', async () => {
    drizzle.db.execute
      .mockResolvedValueOnce([{ total: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([]);

    const result = await service.getKPIs('tenant-1');

    expect(result.map((kpi) => kpi.change)).toEqual([0, 0, 0, 0]);
    expect(result.map((kpi) => kpi.value)).toEqual([0, 0, 0, 0]);
  });

  it('calculates downward KPI trends when current period underperforms', async () => {
    drizzle.db.execute
      .mockResolvedValueOnce([{ total: '500' }])
      .mockResolvedValueOnce([{ total: '1000' }])
      .mockResolvedValueOnce([{ count: '5' }])
      .mockResolvedValueOnce([{ count: '5' }])
      .mockResolvedValueOnce([{ count: '1' }])
      .mockResolvedValueOnce([{ count: '4' }]);

    const result = await service.getKPIs('tenant-1');

    expect(result).toEqual([
      { label: 'Revenue', value: 500, change: -50, trend: 'down', format: 'currency' },
      { label: 'Orders', value: 5, change: 0, trend: 'up', format: 'number' },
      { label: 'New Customers', value: 1, change: -75, trend: 'down', format: 'number' },
      { label: 'Avg Order Value', value: 100, change: -50, trend: 'down', format: 'currency' },
    ]);
  });

  it('builds revenue charts for requested periods', async () => {
    drizzle.db.execute.mockResolvedValueOnce([
      { date: '2026-05-20', revenue: '300', orders: '2' },
      { date: '2026-05-21', revenue: 700, orders: 4 },
    ]);

    await expect(service.getRevenueChart('tenant-1', '7d')).resolves.toEqual({
      labels: ['2026-05-20', '2026-05-21'],
      datasets: [
        { label: 'Revenue', data: [300, 700], color: '#3b82f6' },
        { label: 'Orders', data: [2, 4], color: '#10b981' },
      ],
    });
  });

  it('builds revenue charts for default, quarterly, and yearly periods', async () => {
    drizzle.db.execute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(service.getRevenueChart('tenant-1')).resolves.toEqual({
      labels: [],
      datasets: [
        { label: 'Revenue', data: [], color: '#3b82f6' },
        { label: 'Orders', data: [], color: '#10b981' },
      ],
    });
    await expect(service.getRevenueChart('tenant-1', '90d')).resolves.toMatchObject({ labels: [] });
    await expect(service.getRevenueChart('tenant-1', '1y')).resolves.toMatchObject({ labels: [] });
  });

  it('delegates top product and customer segmentation queries', async () => {
    const topProducts = [{ id: 'p1', name: 'Coffee', sku: 'SKU-1', total_sold: 3, total_revenue: 900 }];
    const segments = [{ segment: 'VIP', count: 2, total_revenue: 1000 }];
    drizzle.db.execute
      .mockResolvedValueOnce(topProducts)
      .mockResolvedValueOnce(segments);

    await expect(service.getTopProducts('tenant-1', 5)).resolves.toBe(topProducts);
    await expect(service.getCustomerSegmentation('tenant-1')).resolves.toBe(segments);
    expect(drizzle.db.execute).toHaveBeenCalledTimes(2);
  });

  it('uses the default top product limit', async () => {
    const topProducts: any[] = [];
    drizzle.db.execute.mockResolvedValueOnce(topProducts);

    await expect(service.getTopProducts('tenant-1')).resolves.toBe(topProducts);
  });
});
