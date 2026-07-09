import { AiCopilotService } from './ai-copilot.service';

describe('AiCopilotService revenue target', () => {
  const originalEnv = process.env.REVENUE_TARGET;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.REVENUE_TARGET;
    } else {
      process.env.REVENUE_TARGET = originalEnv;
    }
  });

  it('uses a configurable revenue target from environment', () => {
    process.env.REVENUE_TARGET = '5000000';
    const service = new AiCopilotService({ db: {} } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const target = (service as any).getRevenueTarget();

    expect(target).toBe(5_000_000);
  });

  it('falls back to a default target when env is not set', () => {
    delete process.env.REVENUE_TARGET;
    const service = new AiCopilotService({ db: {} } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const target = (service as any).getRevenueTarget();

    expect(typeof target).toBe('number');
    expect(target).toBeGreaterThan(0);
  });

  it('ignores non-numeric env values and falls back to default', () => {
    process.env.REVENUE_TARGET = 'invalid';
    const service = new AiCopilotService({ db: {} } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const target = (service as any).getRevenueTarget();

    expect(typeof target).toBe('number');
    expect(target).toBeGreaterThan(0);
  });
});
