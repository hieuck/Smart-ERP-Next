import { TelemetryService } from './telemetry.service';

jest.mock('@smart-erp/database', () => ({ db: { insert: jest.fn() } }));
jest.mock('@smart-erp/database/schema', () => ({ telemetryEvents: {} }));

const { db } = jest.requireMock('@smart-erp/database') as { db: any };

describe('TelemetryService', () => {
  let service: TelemetryService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.insert.mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{ id: 't1' }]) }) });
    service = new TelemetryService();
  });

  it('tracks feature usage with event name and metadata', async () => {
    await service.track('order.created', 't1', 'u1', { orderValue: 500 });
    expect(db.insert).toHaveBeenCalled();
  });

  it('tracks page views with path info', async () => {
    await service.trackPageView('t1', 'u1', '/dashboard');
    expect(db.insert).toHaveBeenCalled();
  });

  it('can be called without blocking', async () => {
    db.insert.mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockRejectedValue(new Error('db down')) }) });
    await expect(service.track('test', 't1', 'u1', {})).resolves.toBeUndefined();
  });
});
