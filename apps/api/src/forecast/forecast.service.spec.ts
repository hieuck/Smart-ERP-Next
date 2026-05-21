import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { ForecastService } from './forecast.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ForecastService', () => {
  const originalAiForecastUrl = process.env.AI_FORECAST_URL;
  let cacheManager: { get: jest.Mock; set: jest.Mock };
  let service: ForecastService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_FORECAST_URL = originalAiForecastUrl;
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const configService = {
      get: jest.fn().mockReturnValue('http://forecast.test'),
    } as unknown as ConfigService;

    service = new ForecastService(configService, cacheManager as never);
  });

  afterAll(() => {
    process.env.AI_FORECAST_URL = originalAiForecastUrl;
  });

  it('returns cached forecast without calling the AI service', async () => {
    const cached = {
      productId: 'prod-1',
      predictions: [{ date: '2026-05-20', quantity: 12 }],
      suggestedOrder: 42,
      confidenceLower: [{ date: '2026-05-20', quantity: 8 }],
      confidenceUpper: [{ date: '2026-05-20', quantity: 16 }],
      source: 'ai',
      lookaheadDays: 30,
      generatedAt: '2026-05-20T00:00:00.000Z',
    };
    cacheManager.get.mockResolvedValue(cached);

    await expect(service.getMonthlyDemand('prod-1')).resolves.toBe(cached);
    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(cacheManager.set).not.toHaveBeenCalled();
  });

  it('adds forecast metadata when AI service succeeds', async () => {
    cacheManager.get.mockResolvedValue(undefined);
    mockedAxios.post.mockResolvedValue({
      data: {
        predicted_daily_demand: [{ date: '2026-05-21', quantity: 18 }],
        suggested_order_quantity: 54,
        confidence_lower: [{ date: '2026-05-21', quantity: 12 }],
        confidence_upper: [{ date: '2026-05-21', quantity: 24 }],
      },
    });

    const result = await service.getMonthlyDemand('prod-2');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://forecast.test/forecast',
      expect.objectContaining({
        product_id: 'prod-2',
        lookahead_days: 30,
      }),
      { timeout: 10000 },
    );
    expect(result).toMatchObject({
      productId: 'prod-2',
      suggestedOrder: 54,
      source: 'ai',
      lookaheadDays: 30,
    });
    expect(result.generatedAt).toEqual(expect.any(String));
    expect(cacheManager.set).toHaveBeenCalledWith(
      'forecast:prod-2',
      expect.objectContaining({ source: 'ai' }),
      { ttl: 300 },
    );
  });

  it('returns fallback metadata when AI service fails', async () => {
    cacheManager.get.mockResolvedValue(undefined);
    mockedAxios.post.mockRejectedValue(new Error('service unavailable'));

    const result = await service.getMonthlyDemand('prod-3');

    expect(result).toMatchObject({
      productId: 'prod-3',
      source: 'fallback',
      lookaheadDays: 30,
      isFallback: true,
    });
    expect((result as { data: unknown[] }).data).toHaveLength(6);
    expect((result as { predictions: unknown[] }).predictions).toHaveLength(6);
    expect((result as { confidenceLower: unknown[] }).confidenceLower).toHaveLength(6);
    expect((result as { confidenceUpper: unknown[] }).confidenceUpper).toHaveLength(6);
    expect(result).toHaveProperty('suggestedOrder');
    expect(result.generatedAt).toEqual(expect.any(String));
  });

  it('uses AI service URL from environment when config is unset', async () => {
    process.env.AI_FORECAST_URL = 'http://forecast.env';
    cacheManager.get.mockResolvedValue(undefined);
    mockedAxios.post.mockResolvedValue({
      data: {
        predicted_daily_demand: [],
        suggested_order_quantity: 0,
        confidence_lower: [],
        confidence_upper: [],
      },
    });

    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    service = new ForecastService(configService, cacheManager as never);

    await service.getMonthlyDemand('prod-env');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://forecast.env/forecast',
      expect.objectContaining({ product_id: 'prod-env' }),
      { timeout: 10000 },
    );
  });

  it('uses localhost AI service URL when config and environment are unset', async () => {
    delete process.env.AI_FORECAST_URL;
    cacheManager.get.mockResolvedValue(undefined);
    mockedAxios.post.mockResolvedValue({
      data: {
        predicted_daily_demand: [],
        suggested_order_quantity: 0,
        confidence_lower: [],
        confidence_upper: [],
      },
    });
    service = new ForecastService(undefined as never, cacheManager as never);

    await service.getMonthlyDemand('prod-default');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:8000/forecast',
      expect.objectContaining({ product_id: 'prod-default' }),
      { timeout: 10000 },
    );
  });
});
