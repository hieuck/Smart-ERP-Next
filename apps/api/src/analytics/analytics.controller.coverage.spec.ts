import { AnalyticsController } from './analytics.controller';

describe('AnalyticsController', () => {
  let svc: any;
  let ctrl: AnalyticsController;

  beforeEach(() => {
    svc = { getKPIs: jest.fn(), getRevenueChart: jest.fn(), getTopProducts: jest.fn() };
    ctrl = new AnalyticsController(svc);
  });

  const req = { user: { tenantId: 't1' } };

  it('getKPIs delegates to service', async () => {
    svc.getKPIs.mockResolvedValue([{ label: 'Revenue', value: 1000 }]);
    const r = await ctrl.getKPIs(req);
    expect(svc.getKPIs).toHaveBeenCalledWith('t1');
    expect(r).toEqual([{ label: 'Revenue', value: 1000 }]);
  });

  it('getRevenueChart delegates to service', async () => {
    svc.getRevenueChart.mockResolvedValue({ labels: [], datasets: [] });
    await ctrl.getRevenueChart(req, '30d');
    expect(svc.getRevenueChart).toHaveBeenCalledWith('t1', '30d');
  });

  it('getTopProducts delegates to service', async () => {
    svc.getTopProducts.mockResolvedValue([]);
    await ctrl.getTopProducts(req, '5');
    expect(svc.getTopProducts).toHaveBeenCalledWith('t1', 5);
  });

  it('getTopProducts defaults limit to 10', async () => {
    svc.getTopProducts.mockResolvedValue([]);
    await ctrl.getTopProducts(req, undefined);
    expect(svc.getTopProducts).toHaveBeenCalledWith('t1', 10);
  });
});
