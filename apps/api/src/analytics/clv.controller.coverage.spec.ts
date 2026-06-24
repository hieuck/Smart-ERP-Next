import { ClvController } from './clv.controller';

describe('ClvController', () => {
  let svc: any;
  let ctrl: ClvController;

  beforeEach(() => {
    svc = {
      computeAndStore: jest.fn(),
      getLatestPredictions: jest.fn(),
      getSegmentationSummary: jest.fn(),
    };
    ctrl = new ClvController(svc);
  });

  const user = { tenantId: 't1', sub: 'u1' };

  it('compute delegates to clvService.computeAndStore', async () => {
    svc.computeAndStore.mockResolvedValue(undefined);
    const r = await ctrl.compute(user);
    expect(svc.computeAndStore).toHaveBeenCalledWith('t1');
    expect(r).toEqual({ message: 'CLV computation completed' });
  });

  it('getPredictions delegates to clvService.getLatestPredictions with segment', async () => {
    svc.getLatestPredictions.mockResolvedValue([{ id: 'c1', segment: 'vip' }]);
    const r = await ctrl.getPredictions(user, 'vip');
    expect(svc.getLatestPredictions).toHaveBeenCalledWith('t1', 'vip');
    expect(r).toEqual([{ id: 'c1', segment: 'vip' }]);
  });

  it('getPredictions delegates to clvService.getLatestPredictions without segment', async () => {
    svc.getLatestPredictions.mockResolvedValue([]);
    const r = await ctrl.getPredictions(user, undefined);
    expect(svc.getLatestPredictions).toHaveBeenCalledWith('t1', undefined);
    expect(r).toEqual([]);
  });

  it('getSummary delegates to clvService.getSegmentationSummary', async () => {
    svc.getSegmentationSummary.mockResolvedValue([{ segment: 'vip', count: 3 }]);
    const r = await ctrl.getSummary(user);
    expect(svc.getSegmentationSummary).toHaveBeenCalledWith('t1');
    expect(r).toEqual([{ segment: 'vip', count: 3 }]);
  });
});
