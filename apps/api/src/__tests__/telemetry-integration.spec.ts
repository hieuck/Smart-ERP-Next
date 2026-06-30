import { TelemetryService } from '../analytics/telemetry.service';

jest.mock('@smart-erp/database', () => ({ db: { insert: jest.fn() } }));
jest.mock('@smart-erp/database/schema', () => ({ telemetryEvents: {} }));

const { db } = jest.requireMock('@smart-erp/database') as { db: any };

describe('TelemetryService integration', () => {
  let service: TelemetryService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.insert.mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{ id: 't1' }]) }) });
    service = new TelemetryService();
  });

  it('tracks an event', async () => {
    await service.track('order.placed', 't1', 'u1', { value: 100 });
    expect(db.insert).toHaveBeenCalled();
  });

  it('tracks a page view', async () => {
    await service.trackPageView('t1', 'u1', '/dashboard');
    expect(db.insert).toHaveBeenCalled();
  });

  it('does not throw when db fails', async () => {
    db.insert.mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockRejectedValue(new Error('down')) }) });
    await expect(service.track('test', 't1', 'u1', {})).resolves.toBeUndefined();
  });

  it('tracks events with empty metadata', async () => {
    await service.track('user.login', 't1', 'u1');
    expect(db.insert).toHaveBeenCalled();
  });
});
