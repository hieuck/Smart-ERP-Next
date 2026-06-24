import { CashflowController } from './cashflow.controller';

describe('CashflowController', () => {
  let svc: any;
  let ctrl: CashflowController;

  beforeEach(() => {
    svc = {
      forecast: jest.fn(),
    };
    ctrl = new CashflowController(svc);
  });

  const user = { tenantId: 't1', sub: 'u1' };

  it('getForecast delegates to cashflowService.forecast with default days', async () => {
    svc.forecast.mockResolvedValue({ dates: [], values: [], historical: [] });
    const r = await ctrl.getForecast(user, undefined);
    expect(svc.forecast).toHaveBeenCalledWith('t1', 30);
    expect(r).toEqual({ dates: [], values: [], historical: [] });
  });

  it('getForecast delegates with custom days', async () => {
    svc.forecast.mockResolvedValue({ dates: ['2025-01-01'], values: [100], historical: [] });
    const r = await ctrl.getForecast(user, '15');
    expect(svc.forecast).toHaveBeenCalledWith('t1', 15);
    expect(r).toEqual({ dates: ['2025-01-01'], values: [100], historical: [] });
  });

  it('getForecast caps at 90 days', async () => {
    svc.forecast.mockResolvedValue({ dates: [], values: [], historical: [] });
    await ctrl.getForecast(user, '200');
    expect(svc.forecast).toHaveBeenCalledWith('t1', 90);
  });
});
