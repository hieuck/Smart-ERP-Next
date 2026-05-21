jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { BenchmarkService } from './benchmark.service';

const selectChain = (rows: any[], terminal: 'groupBy' | 'limit' | 'orderBy') => {
  const chain: any = {
    from: jest.fn(() => chain),
    groupBy: jest.fn(() => (terminal === 'groupBy' ? Promise.resolve(rows) : chain)),
    limit: jest.fn(() => Promise.resolve(rows)),
    orderBy: jest.fn(() => (terminal === 'orderBy' ? Promise.resolve(rows) : chain)),
    where: jest.fn(() => chain),
  };
  return chain;
};

describe('BenchmarkService coverage', () => {
  const db = {
    insert: jest.fn(() => ({ values: jest.fn().mockResolvedValue(undefined) })),
    select: jest.fn(),
  };
  const service = new BenchmarkService(db as any);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('records sync benchmarks and aggregates stats/timeseries', async () => {
    await expect(service.record('tenant-1', 'client-1', '/sync', 'ok', 125)).resolves.toBeUndefined();
    expect(db.insert.mock.results[0].value.values).toHaveBeenCalledWith({
      changesCount: 0,
      clientId: 'client-1',
      durationMs: 125,
      endpoint: '/sync',
      sizeBytes: 0,
      status: 'ok',
      tenantId: 'tenant-1',
    });

    db.select
      .mockReturnValueOnce(selectChain([{ endpoint: '/sync' }], 'groupBy'))
      .mockReturnValueOnce(selectChain([{ id: 'event-1' }], 'limit'))
      .mockReturnValueOnce(selectChain([{ time: 'bucket' }], 'orderBy'))
      .mockReturnValueOnce(selectChain([{ endpoint: '/default' }], 'groupBy'))
      .mockReturnValueOnce(selectChain([{ id: 'event-default' }], 'limit'))
      .mockReturnValueOnce(selectChain([{ time: 'default-bucket' }], 'orderBy'));
    await expect(service.getStats('tenant-1', 2)).resolves.toEqual({
      recentEvents: [{ id: 'event-1' }],
      stats: [{ endpoint: '/sync' }],
    });
    await expect(service.getTimeseries('tenant-1', 2, 60)).resolves.toEqual([{ time: 'bucket' }]);
    await expect(service.getStats('tenant-1')).resolves.toEqual({
      recentEvents: [{ id: 'event-default' }],
      stats: [{ endpoint: '/default' }],
    });
    await expect(service.getTimeseries('tenant-1')).resolves.toEqual([{ time: 'default-bucket' }]);
  });
});
