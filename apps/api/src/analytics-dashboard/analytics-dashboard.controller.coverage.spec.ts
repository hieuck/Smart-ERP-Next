import { AnalyticsDashboardController } from './analytics-dashboard.controller';

describe('AnalyticsDashboardController coverage', () => {
  const req = { user: { tenantId: 't1', sub: 'u1' } };
  const service = {
    getKPIs: jest.fn(),
    getRevenueChart: jest.fn(),
    getTopProducts: jest.fn(),
    getAIInsights: jest.fn(),
  };
  const controller = new AnalyticsDashboardController(service as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates getKPIs to service.getKPIs with default period', () => {
    controller.getKPIs(req, undefined);
    expect(service.getKPIs).toHaveBeenCalledWith(req.user.tenantId, 'month');
  });

  it('delegates getKPIs to service.getKPIs with custom period', () => {
    controller.getKPIs(req, 'week');
    expect(service.getKPIs).toHaveBeenCalledWith(req.user.tenantId, 'week');
  });

  it('delegates getRevenueChart to service.getRevenueChart with default days', () => {
    controller.getRevenueChart(req, undefined);
    expect(service.getRevenueChart).toHaveBeenCalledWith(req.user.tenantId, 30);
  });

  it('delegates getRevenueChart to service.getRevenueChart with custom days', () => {
    controller.getRevenueChart(req, 90);
    expect(service.getRevenueChart).toHaveBeenCalledWith(req.user.tenantId, 90);
  });

  it('delegates getTopProducts to service.getTopProducts with default limit', () => {
    controller.getTopProducts(req, undefined);
    expect(service.getTopProducts).toHaveBeenCalledWith(req.user.tenantId, 10);
  });

  it('delegates getTopProducts to service.getTopProducts with custom limit', () => {
    controller.getTopProducts(req, 5);
    expect(service.getTopProducts).toHaveBeenCalledWith(req.user.tenantId, 5);
  });

  it('delegates getAIInsights to service.getAIInsights', () => {
    controller.getAIInsights(req);
    expect(service.getAIInsights).toHaveBeenCalledWith(req.user.tenantId);
  });
});
