import { ChurnController } from './churn.controller';

describe('ChurnController', () => {
  let svc: any;
  let ctrl: ChurnController;

  beforeEach(() => {
    svc = {
      computeAndStore: jest.fn(),
      getLatestPredictions: jest.fn(),
      getSegmentSummary: jest.fn(),
    };
    ctrl = new ChurnController(svc);
  });

  const user = { tenantId: 't1', sub: 'u1' };

  it('compute delegates to churnService.computeAndStore', async () => {
    svc.computeAndStore.mockResolvedValue(undefined);
    const r = await ctrl.compute(user);
    expect(svc.computeAndStore).toHaveBeenCalledWith('t1');
    expect(r).toEqual({ message: 'Churn prediction completed' });
  });

  it('getPredictions delegates to churnService.getLatestPredictions with risk query', async () => {
    svc.getLatestPredictions.mockResolvedValue([{ id: 'p1', risk_segment: 'high' }]);
    const r = await ctrl.getPredictions(user, 'high');
    expect(svc.getLatestPredictions).toHaveBeenCalledWith('t1', 'high');
    expect(r).toEqual([{ id: 'p1', risk_segment: 'high' }]);
  });

  it('getPredictions delegates to churnService.getLatestPredictions without risk', async () => {
    svc.getLatestPredictions.mockResolvedValue([]);
    const r = await ctrl.getPredictions(user, undefined);
    expect(svc.getLatestPredictions).toHaveBeenCalledWith('t1', undefined);
    expect(r).toEqual([]);
  });

  it('getSummary delegates to churnService.getSegmentSummary', async () => {
    svc.getSegmentSummary.mockResolvedValue([{ risk_segment: 'high', count: 5 }]);
    const r = await ctrl.getSummary(user);
    expect(svc.getSegmentSummary).toHaveBeenCalledWith('t1');
    expect(r).toEqual([{ risk_segment: 'high', count: 5 }]);
  });
});
