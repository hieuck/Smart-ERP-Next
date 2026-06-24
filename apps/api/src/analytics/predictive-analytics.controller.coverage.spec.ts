import { PredictiveAnalyticsController } from './predictive-analytics.controller';

describe('PredictiveAnalyticsController', () => {
  let svc: any;
  let ctrl: PredictiveAnalyticsController;

  beforeEach(() => {
    svc = {
      calculateCLVScores: jest.fn(),
      getSalesTrend: jest.fn(),
      getAtRiskCustomers: jest.fn(),
    };
    ctrl = new PredictiveAnalyticsController(svc);
  });

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  it('getCLVScores delegates to service.calculateCLVScores', async () => {
    svc.calculateCLVScores.mockResolvedValue([{ customerId: 'c1', clvScore: 80 }]);
    const r = await ctrl.getCLVScores(req);
    expect(svc.calculateCLVScores).toHaveBeenCalledWith('t1');
    expect(r).toEqual([{ customerId: 'c1', clvScore: 80 }]);
  });

  it('getSalesTrend delegates to service.getSalesTrend with default weeks', async () => {
    svc.getSalesTrend.mockResolvedValue([{ period: '2025-W01', revenue: 1000 }]);
    const r = await ctrl.getSalesTrend(req, undefined);
    expect(svc.getSalesTrend).toHaveBeenCalledWith('t1', 12);
    expect(r).toEqual([{ period: '2025-W01', revenue: 1000 }]);
  });

  it('getSalesTrend delegates with custom weeks', async () => {
    svc.getSalesTrend.mockResolvedValue([{ period: '2025-W01', revenue: 2000 }]);
    const r = await ctrl.getSalesTrend(req, '8');
    expect(svc.getSalesTrend).toHaveBeenCalledWith('t1', 8);
    expect(r).toEqual([{ period: '2025-W01', revenue: 2000 }]);
  });

  it('getAtRiskCustomers delegates to service.getAtRiskCustomers', async () => {
    svc.getAtRiskCustomers.mockResolvedValue([{ customerId: 'c1', churnRisk: 'high' }]);
    const r = await ctrl.getAtRiskCustomers(req);
    expect(svc.getAtRiskCustomers).toHaveBeenCalledWith('t1');
    expect(r).toEqual([{ customerId: 'c1', churnRisk: 'high' }]);
  });
});
