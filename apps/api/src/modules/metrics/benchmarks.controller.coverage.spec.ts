import { BenchmarksController } from './benchmarks.controller';

describe('BenchmarksController coverage', () => {
  const req = { user: { tenantId: 't1', sub: 'u1' } };
  const benchmarkService = {
    getStats: jest.fn(),
    getTimeseries: jest.fn(),
  };
  const ctrl = new BenchmarksController(benchmarkService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getSyncBenchmarks delegates to service with default hours', async () => {
    benchmarkService.getStats.mockResolvedValue({ synced: 10 });
    const result = await ctrl.getSyncBenchmarks(req, undefined);
    expect(benchmarkService.getStats).toHaveBeenCalledWith('t1', 24);
    expect(result).toEqual({ synced: 10 });
  });

  it('getSyncBenchmarks delegates to service with custom hours', async () => {
    benchmarkService.getStats.mockResolvedValue({ synced: 5 });
    const result = await ctrl.getSyncBenchmarks(req, '12');
    expect(benchmarkService.getStats).toHaveBeenCalledWith('t1', 12);
    expect(result).toEqual({ synced: 5 });
  });

  it('getSyncTimeseries delegates to service with default hours', async () => {
    benchmarkService.getTimeseries.mockResolvedValue([]);
    const result = await ctrl.getSyncTimeseries(req, undefined);
    expect(benchmarkService.getTimeseries).toHaveBeenCalledWith('t1', 24);
    expect(result).toEqual([]);
  });

  it('getSyncTimeseries delegates to service with custom hours', async () => {
    benchmarkService.getTimeseries.mockResolvedValue([{ hour: 1, count: 3 }]);
    const result = await ctrl.getSyncTimeseries(req, '6');
    expect(benchmarkService.getTimeseries).toHaveBeenCalledWith('t1', 6);
    expect(result).toEqual([{ hour: 1, count: 3 }]);
  });
});
