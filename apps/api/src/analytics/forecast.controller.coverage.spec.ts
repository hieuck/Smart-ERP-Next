import { ForecastController } from './forecast.controller';

describe('ForecastController (analytics)', () => {
  let svc: any;
  let ctrl: ForecastController;

  beforeEach(() => {
    svc = {
      getDemandForecast: jest.fn(),
    };
    ctrl = new ForecastController(svc);
  });

  const user = { tenantId: 't1', sub: 'u1' };

  it('getProductForecast delegates to forecastService.getDemandForecast with default days', async () => {
    svc.getDemandForecast.mockResolvedValue({ forecast: [], reorderRecommendation: null });
    const r = await ctrl.getProductForecast(user, 'prod-1', undefined);
    expect(svc.getDemandForecast).toHaveBeenCalledWith('t1', 'prod-1', 30);
    expect(r).toEqual({ forecast: [], reorderRecommendation: null });
  });

  it('getProductForecast delegates with custom days', async () => {
    svc.getDemandForecast.mockResolvedValue({ forecast: [10, 12], reorderRecommendation: 50 });
    const r = await ctrl.getProductForecast(user, 'prod-2', '45');
    expect(svc.getDemandForecast).toHaveBeenCalledWith('t1', 'prod-2', 45);
    expect(r).toEqual({ forecast: [10, 12], reorderRecommendation: 50 });
  });

  it('getProductForecast caps at 90 days', async () => {
    svc.getDemandForecast.mockResolvedValue({ forecast: [], reorderRecommendation: null });
    await ctrl.getProductForecast(user, 'prod-1', '200');
    expect(svc.getDemandForecast).toHaveBeenCalledWith('t1', 'prod-1', 90);
  });
});
