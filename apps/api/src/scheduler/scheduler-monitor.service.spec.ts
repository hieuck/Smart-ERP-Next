import { SchedulerMonitorService } from './scheduler-monitor.service';

jest.mock('@smart-erp/database', () => ({ db: { insert: jest.fn(), select: jest.fn() } }));
jest.mock('@smart-erp/database/schema', () => ({ schedulerLog: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({ eq: jest.fn((x) => x), desc: jest.fn((x) => x) }));

const { db } = jest.requireMock('@smart-erp/database') as { db: any };

describe('SchedulerMonitorService', () => {
  let service: SchedulerMonitorService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.insert.mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{ id: 'log-1' }]) }) });
    service = new SchedulerMonitorService();
  });

  it('records a successful job execution', async () => {
    await service.recordRun('check-low-stock', true, 1500);
    expect(db.insert).toHaveBeenCalled();
  });

  it('records a failed job execution', async () => {
    await service.recordRun('cleanup-logs', false, 3000, 'Timeout');
    expect(db.insert).toHaveBeenCalled();
  });

  const mockSelect = (data: any[]) => {
    const chain: Record<string, any> = {};
    chain.orderBy = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockResolvedValue(data);
    chain.where = jest.fn().mockReturnValue(chain);
    return { from: jest.fn().mockReturnValue(chain) };
  };

  it('returns recent job history', async () => {
    const entries = [{ jobName: 'check-stock', success: true, durationMs: 500 }];
    db.select.mockReturnValue(mockSelect(entries));
    const result = await service.getRecentRuns('check-stock', 5);
    expect(result).toHaveLength(1);
    expect(result[0].jobName).toBe('check-stock');
  });

  it('returns empty array when no history', async () => {
    db.select.mockReturnValue(mockSelect([]));
    const result = await service.getRecentRuns('unknown-job', 5);
    expect(result).toEqual([]);
  });

  it('reports consecutive failures', async () => {
    const failures = Array.from({ length: 3 }, (_, i) => ({ jobName: 'email-sync', success: false, createdAt: new Date() }));
    db.select.mockReturnValue(mockSelect(failures));
    const result = await service.getConsecutiveFailures('email-sync', 3);
    expect(result).toBe(true);
  });
});
