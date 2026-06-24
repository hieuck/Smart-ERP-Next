import { ReportsController } from './reports.controller';

describe('ReportsController coverage', () => {
  let svc: any;
  let ctrl: ReportsController;

  beforeEach(() => {
    svc = {
      getRevenueReport: jest.fn(),
      getProfitReport: jest.fn(),
      getTopProducts: jest.fn(),
      getInventoryReport: jest.fn(),
      getCustomerReport: jest.fn(),
      getSummary: jest.fn(),
    };
    ctrl = new ReportsController(svc);
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  it('getRevenue delegates to service with parsed dates and groupBy', async () => {
    svc.getRevenueReport.mockResolvedValue([{ period: '2026-05', revenue: 1000 }]);
    const r = await ctrl.getRevenue(req, '2026-05-01', '2026-05-31', 'month');
    expect(svc.getRevenueReport).toHaveBeenCalledWith(
      't1',
      new Date('2026-05-01'),
      new Date('2026-05-31'),
      'month',
    );
    expect(r).toEqual([{ period: '2026-05', revenue: 1000 }]);
  });

  it('getRevenue uses default range when params omitted', async () => {
    svc.getRevenueReport.mockResolvedValue([]);
    await ctrl.getRevenue(req);
    expect(svc.getRevenueReport).toHaveBeenCalledWith(
      't1',
      expect.any(Date),
      expect.any(Date),
      'day',
    );
  });

  it('getProfit delegates to service', async () => {
    svc.getProfitReport.mockResolvedValue([{ period: '2026-05', profit: 400 }]);
    const r = await ctrl.getProfit(req, '2026-05-01', '2026-05-31');
    expect(svc.getProfitReport).toHaveBeenCalledWith(
      't1',
      new Date('2026-05-01'),
      new Date('2026-05-31'),
    );
    expect(r).toEqual([{ period: '2026-05', profit: 400 }]);
  });

  it('getTopProducts delegates to service with limit', async () => {
    svc.getTopProducts.mockResolvedValue([{ productId: 'p1', revenue: 900 }]);
    const r = await ctrl.getTopProducts(req, '2026-05-01', '2026-05-31', '5');
    expect(svc.getTopProducts).toHaveBeenCalledWith(
      't1',
      new Date('2026-05-01'),
      new Date('2026-05-31'),
      5,
    );
    expect(r).toEqual([{ productId: 'p1', revenue: 900 }]);
  });

  it('getTopProducts defaults limit to 10', async () => {
    svc.getTopProducts.mockResolvedValue([]);
    await ctrl.getTopProducts(req);
    expect(svc.getTopProducts).toHaveBeenCalledWith(
      't1',
      expect.any(Date),
      expect.any(Date),
      10,
    );
  });

  it('getInventory delegates to service', async () => {
    svc.getInventoryReport.mockResolvedValue({ totalProducts: 10 });
    const r = await ctrl.getInventory(req);
    expect(svc.getInventoryReport).toHaveBeenCalledWith('t1');
    expect(r).toEqual({ totalProducts: 10 });
  });

  it('getCustomers delegates to service', async () => {
    svc.getCustomerReport.mockResolvedValue([{ id: 'c1' }]);
    const r = await ctrl.getCustomers(req, '2026-05-01', '2026-05-31');
    expect(svc.getCustomerReport).toHaveBeenCalledWith(
      't1',
      new Date('2026-05-01'),
      new Date('2026-05-31'),
    );
    expect(r).toEqual([{ id: 'c1' }]);
  });

  it('getSummary delegates to service', async () => {
    svc.getSummary.mockResolvedValue({ orderCount: 5, revenue: 5000 });
    const r = await ctrl.getSummary(req, '2026-05-01', '2026-05-31');
    expect(svc.getSummary).toHaveBeenCalledWith(
      't1',
      new Date('2026-05-01'),
      new Date('2026-05-31'),
    );
    expect(r).toEqual({ orderCount: 5, revenue: 5000 });
  });
});
