import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { ForecastService } from '../forecast/forecast.service';

describe('InsightsController coverage', () => {
  const req = { user: { tenantId: 't1', sub: 'u1' } };
  const insightsService = {
    getDashboardInsights: jest.fn(),
    getForecast: jest.fn(),
  } as unknown as InsightsService;
  const forecastService = {} as ForecastService;
  const controller = new InsightsController(insightsService, forecastService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates getDashboardInsights to insightsService.getDashboardInsights', () => {
    controller.getDashboardInsights(req);
    expect(insightsService.getDashboardInsights).toHaveBeenCalledWith(req.user.tenantId);
  });

  it('returns aiInsights from getDashboardInsights', async () => {
    insightsService.getDashboardInsights.mockResolvedValue({
      aiInsights: {
        demandForecast: 180,
        suggestedReorder: 45,
        pendingApprovals: 3,
      },
    });

    const result = await controller.getDashboardInsights(req);

    expect(result).toMatchObject({
      aiInsights: {
        demandForecast: 180,
        suggestedReorder: 45,
        pendingApprovals: 3,
      },
    });
  });

  it('delegates getForecast to insightsService.getForecast with default days', () => {
    controller.getForecast(req, undefined);
    expect(insightsService.getForecast).toHaveBeenCalledWith(req.user.tenantId, 30);
  });

  it('delegates getForecast to insightsService.getForecast with custom days', () => {
    controller.getForecast(req, '60');
    expect(insightsService.getForecast).toHaveBeenCalledWith(req.user.tenantId, 60);
  });
});
