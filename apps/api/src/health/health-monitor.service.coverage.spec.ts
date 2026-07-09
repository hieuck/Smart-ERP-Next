const createMockSocket = () => {
  const handlers: Record<string, ((...args: any[]) => void)[]> = {};
  const socket = {
    on: jest.fn((event: string, handler: (...args: any[]) => void) => {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(handler);
      return socket;
    }),
    connect: jest.fn(function (this: any) {
      return socket;
    }),
    destroy: jest.fn(),
    emit: jest.fn((event: string, ...args: any[]) => {
      (handlers[event] ?? []).forEach((h) => h(...args));
      return true;
    }),
  };
  return { socket, handlers };
};

let mockSocketInstance = createMockSocket().socket;

jest.mock('net', () => ({
  Socket: jest.fn().mockImplementation(() => mockSocketInstance),
}));

jest.mock('drizzle-orm', () => ({
  sql: jest.fn((strings, ...values) => ({ strings, values })),
}));

import { HealthMonitorService } from './health-monitor.service';

describe('HealthMonitorService cache check', () => {
  const createService = () =>
    new HealthMonitorService(
      { get: jest.fn() } as any,
      { db: { execute: jest.fn() } } as any,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocketInstance = createMockSocket().socket;
    delete process.env.CACHE_URL;
    delete process.env.REDIS_URL;
  });

  it('returns up when no cache is configured', async () => {
    const service = createService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (service as any).checkCache();
    expect(result.status).toBe('up');
    expect(result.latencyMs).toBe(0);
  });

  it('returns up when cache TCP connection succeeds', async () => {
    process.env.CACHE_URL = 'redis://localhost:6379';
    mockSocketInstance.connect.mockImplementation(function (this: any) {
      setImmediate(() => this.emit('connect'));
      return this;
    });

    const service = createService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (service as any).checkCache();
    expect(result.status).toBe('up');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(mockSocketInstance.destroy).toHaveBeenCalled();
  });

  it('returns down when cache TCP connection fails', async () => {
    process.env.CACHE_URL = 'redis://localhost:6379';
    mockSocketInstance.connect.mockImplementation(function (this: any) {
      setImmediate(() => this.emit('error', new Error('Connection refused')));
      return this;
    });

    const service = createService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (service as any).checkCache();
    expect(result.status).toBe('down');
    expect(result.error).toContain('Connection refused');
    expect(mockSocketInstance.destroy).toHaveBeenCalled();
  });

  it('returns down for invalid cache URL', async () => {
    process.env.CACHE_URL = 'not-a-valid-url';

    const service = createService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (service as any).checkCache();
    expect(result.status).toBe('down');
    expect(result.error).toContain('Invalid');
  });
});

describe('HealthMonitorService overall health', () => {
  const db = { execute: jest.fn() };
  let service: HealthMonitorService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    delete process.env.CACHE_URL;
    delete process.env.REDIS_URL;
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
        cache: { status: 'up', latencyMs: 0 },
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
