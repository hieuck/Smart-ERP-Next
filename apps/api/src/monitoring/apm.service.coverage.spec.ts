jest.mock('os', () => ({
  totalmem: jest.fn(),
  freemem: jest.fn(),
  loadavg: jest.fn(),
  cpus: jest.fn(),
}));

import os from 'os';
import { ApmService } from './apm.service';

describe('ApmService coverage', () => {
  let service: ApmService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('alert-id');
    (os.totalmem as jest.Mock).mockReturnValue(1000);
    (os.freemem as jest.Mock).mockReturnValue(500);
    (os.loadavg as jest.Mock).mockReturnValue([0]);
    (os.cpus as jest.Mock).mockReturnValue([{}, {}]);
    service = new ApmService({} as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('records requests, trims latency history, traces slow spans, and resets metrics', () => {
    const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);

    for (let i = 0; i < 1002; i++) {
      service.recordRequest(i, i % 10 === 0);
    }
    service.recordSlowQuery(6000);

    const traceId = service.startTrace('checkout', { orderId: 'order-1' });
    jest.advanceTimersByTime(1500);
    expect(service.endTrace(traceId)).toMatchObject({
      id: 'alert-id',
      name: 'checkout',
      duration: 1500,
      metadata: { orderId: 'order-1' },
    });
    expect(service.endTrace('missing')).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('Very slow query detected: 6000ms');
    expect(warnSpy).toHaveBeenCalledWith('Slow operation: checkout took 1500ms');

    const metrics = service.getMetrics();
    expect(metrics.requests.total).toBe(1002);
    expect(metrics.requests.avgLatencyMs).toBeGreaterThan(0);
    expect(metrics.database.slowQueries).toBe(1);

    service.reset();
    const resetMetrics = service.getMetrics();
    expect(resetMetrics.requests).toMatchObject({
      total: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      errorRate: 0,
    });
    expect(resetMetrics.database.slowQueries).toBe(0);
  });

  it('emits alerts for error rate, latency, memory, and CPU thresholds', () => {
    (os.totalmem as jest.Mock).mockReturnValue(1000);
    (os.freemem as jest.Mock).mockReturnValue(50);
    (os.loadavg as jest.Mock).mockReturnValue([4]);
    (os.cpus as jest.Mock).mockReturnValue([{}, {}]);

    service.recordRequest(100, false);
    service.recordRequest(2500, true);
    service.recordRequest(3000, true);

    const metrics = service.getMetrics();

    expect(metrics.alerts.map((alert) => alert.metric)).toEqual([
      'errorRate',
      'p95Latency',
      'memoryUsage',
      'cpuUsage',
    ]);
    expect(metrics.system.memoryUsage).toBe(95);
    expect(metrics.system.cpuUsage).toBe(200);
  });

  it('uses safe metric fallbacks for zero latency, CPU, and memory denominators', () => {
    (os.totalmem as jest.Mock).mockReturnValue(0);
    (os.freemem as jest.Mock).mockReturnValue(0);
    (os.loadavg as jest.Mock).mockReturnValue([1]);
    (os.cpus as jest.Mock).mockReturnValue([]);

    service.recordRequest(0, false);

    const metrics = service.getMetrics();

    expect(metrics.requests.p95LatencyMs).toBe(0);
    expect(metrics.requests.p99LatencyMs).toBe(0);
    expect(metrics.system.cpuUsage).toBe(100);
    expect(metrics.system.memoryUsage).toBe(0);
  });
});
