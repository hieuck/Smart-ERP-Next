jest.mock('axios', () => ({ post: jest.fn() }));

import axios from 'axios';
import { InventoryRecommendationService } from './inventory-recommendation.service';

const mockedAxios = axios as unknown as { post: jest.Mock };

describe('InventoryRecommendationService coverage', () => {
  const forecastService = { getMonthlyDemand: jest.fn() };
  const activityService = { log: jest.fn() };
  let service: InventoryRecommendationService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    forecastService.getMonthlyDemand.mockResolvedValue([]);
    activityService.log.mockResolvedValue(undefined);
    service = new InventoryRecommendationService(forecastService as any, activityService as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    delete process.env.AI_FORECAST_URL;
  });

  it('returns legacy reorder recommendations and logs activity', async () => {
    forecastService.getMonthlyDemand.mockResolvedValueOnce([{ demand: 10 }, { demand: 20 }, { demand: 30 }]);

    await expect(service.getRecommendation('tenant-1', 'user-1', 'product-1', 12)).resolves.toEqual({
      productId: 'product-1',
      suggestedReorder: 8,
    });
    expect(activityService.log).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      entityId: 'product-1',
      details: { type: 'reorder_suggestion', suggested: 8, currentStock: 12 },
    }));
  });

  it('returns AI reorder suggestions and logs AI details', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        should_reorder: true,
        current_stock: 4,
        predicted_demand_next_7d: 12,
        predicted_demand_next_30d: 40,
        suggested_order_quantity: 36,
        safety_stock: 3,
        reorder_point: 12,
        days_until_stockout: 2,
        reasons: ['Low stock'],
      },
    });

    await expect(service.getReorderSuggestion('tenant-1', 'user-1', 'product-1', 4)).resolves.toEqual({
      productId: 'product-1',
      shouldReorder: true,
      currentStock: 4,
      predictedDemandNext7d: 12,
      predictedDemandNext30d: 40,
      suggestedOrderQuantity: 36,
      safetyStock: 3,
      reorderPoint: 12,
      daysUntilStockout: 2,
      reasons: ['Low stock'],
    });
    expect(mockedAxios.post.mock.calls[0][1].sales_history).toHaveLength(61);
    expect(activityService.log).toHaveBeenCalledWith(expect.objectContaining({
      details: expect.objectContaining({ type: 'ai_reorder_suggestion', suggestedQuantity: 36 }),
    }));
  });

  it('falls back to local demand calculations when AI service fails', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('ai offline'));
    forecastService.getMonthlyDemand.mockResolvedValueOnce([
      { demand: 2 },
      { demand: 2 },
      { demand: 2 },
      { demand: 2 },
      { demand: 2 },
      { demand: 2 },
      { demand: 2 },
    ]);

    await expect(service.getReorderSuggestion('tenant-1', 'user-1', 'product-1', 5)).resolves.toEqual({
      productId: 'product-1',
      shouldReorder: true,
      currentStock: 5,
      predictedDemandNext7d: 14,
      predictedDemandNext30d: 14,
      suggestedOrderQuantity: 51,
      safetyStock: 4,
      reorderPoint: 14,
      daysUntilStockout: 3,
      reasons: ['Current stock (5) is below reorder point (14)'],
    });

    mockedAxios.post.mockRejectedValueOnce(new Error('ai offline'));
    forecastService.getMonthlyDemand.mockResolvedValueOnce([{ demand: 1 }]);
    await expect(service.getReorderSuggestion('tenant-1', 'user-1', 'product-2', 50)).resolves.toMatchObject({
      productId: 'product-2',
      shouldReorder: false,
      suggestedOrderQuantity: 0,
      daysUntilStockout: 30,
    });
  });
});
