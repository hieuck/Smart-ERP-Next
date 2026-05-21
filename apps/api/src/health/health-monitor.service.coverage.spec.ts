jest.mock('drizzle-orm', () => ({
  sql: jest.fn((strings, ...values) => ({ strings, values })),
}));

import { HealthMonitorService } from './health-monitor.service';

describe('HealthMonitorService coverage', () => {
  const db = { execute: jest.fn() };
  let service: HealthMonitorService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    db.execute.mockResolvedValue([]);
    service = new HealthMonitorService({} as any, { db } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports healthy status and request metrics', async () => {
    service.recordRequest(100, false);
    service.recordRequest(300, true);
    jest.advanceTimersByTime(2000);

    await expect(service.getHealth()).resolves.toMatchObject({
      status: 'healthy',
      uptime: 2,
      services: {
        api: { status: 'up' },
        database: { status: 'up' },
        cache: { status: 'up', latencyMs: 1 },
      },
      metrics: {
        requestsPerMinute: 2,
        errorRate: 50,
        avgLatencyMs: 200,
        activeConnections: 0,
      },
    });
  });

  it('reports down database and drops stale request metrics', async () => {
    db.execute.mockRejectedValueOnce(new Error('database unavailable'));
    service.recordRequest(100, false);
    jest.advanceTimersByTime(6 * 60 * 1000);

    await expect(service.getHealth()).resolves.toMatchObject({
      status: 'down',
      services: {
        database: { status: 'down', error: 'database unavailable' },
      },
      metrics: {
        requestsPerMinute: 0,
        errorRate: 0,
        avgLatencyMs: 0,
      },
    });
  });

  it('reports degraded when database latency is high', async () => {
    db.execute.mockImplementationOnce(async () => {
      jest.advanceTimersByTime(1500);
    });

    await expect(service.getHealth()).resolves.toMatchObject({
      status: 'degraded',
      services: {
        database: { status: 'up', latencyMs: 1500 },
      },
    });
  });

  it('treats zero-count request buckets as zero when calculating metrics', async () => {
    (service as any).requestCounts = [
      { time: Date.now(), count: 0, latencyMs: 0, isError: false },
    ];

    await expect(service.getHealth()).resolves.toMatchObject({
      metrics: {
        requestsPerMinute: 0,
        errorRate: 0,
        avgLatencyMs: 0,
      },
    });
  });
});
