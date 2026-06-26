const mockAxiosPost = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: { post: mockAxiosPost },
}));

import { InventoryRecommendationService } from '../inventory-recommendation/inventory-recommendation.service';

describe('InventoryRecommendationService (direct instantiation)', () => {
  let service: InventoryRecommendationService;
  let mockForecastService: any;
  let mockActivityService: any;
  const TENANT_ID = 'tenant-1';
  const USER_ID = 'user-1';
  const PRODUCT_ID = 'prod-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockForecastService = { getMonthlyDemand: jest.fn() };
    mockActivityService = { log: jest.fn() };
    service = new (InventoryRecommendationService as any)(mockForecastService, mockActivityService);
  });

  describe('getRecommendation', () => {
    it('returns suggested reorder when demand exceeds stock', async () => {
      mockForecastService.getMonthlyDemand.mockResolvedValue({
        predictions: [{ quantity: 100 }, { quantity: 80 }, { quantity: 90 }, { quantity: 70 }],
      });

      const result = await service.getRecommendation(TENANT_ID, USER_ID, PRODUCT_ID, 50);

      expect(result.suggestedReorder).toBe(40);
      expect(result.productId).toBe(PRODUCT_ID);
    });

    it('returns 0 when stock exceeds average demand', async () => {
      mockForecastService.getMonthlyDemand.mockResolvedValue({
        predictions: [{ quantity: 10 }, { quantity: 20 }, { quantity: 15 }],
      });

      const result = await service.getRecommendation(TENANT_ID, USER_ID, PRODUCT_ID, 100);

      expect(result.suggestedReorder).toBe(0);
    });

    it('logs activity with reorder suggestion details', async () => {
      mockForecastService.getMonthlyDemand.mockResolvedValue({
        predictions: [{ quantity: 50 }, { quantity: 60 }, { quantity: 55 }],
      });

      await service.getRecommendation(TENANT_ID, USER_ID, PRODUCT_ID, 30);

      expect(mockActivityService.log).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        'created',
        'inventory',
        PRODUCT_ID,
        expect.objectContaining({ type: 'reorder_suggestion', suggested: 25, currentStock: 30 }),
      );
    });
  });

  describe('getReorderSuggestion', () => {
    const aiResponse = {
      data: {
        should_reorder: true,
        current_stock: 50,
        predicted_demand_next_7d: 120,
        predicted_demand_next_30d: 480,
        suggested_order_quantity: 100,
        safety_stock: 36,
        reorder_point: 120,
        days_until_stockout: 5,
        reasons: ['Stock below reorder point'],
      },
    };

    it('returns AI-powered recommendation on success', async () => {
      mockAxiosPost.mockResolvedValue(aiResponse);

      const result = await service.getReorderSuggestion(TENANT_ID, USER_ID, PRODUCT_ID, 50);

      expect(result.productId).toBe(PRODUCT_ID);
      expect(result.shouldReorder).toBe(true);
      expect(result.suggestedOrderQuantity).toBe(100);
      expect(result.predictedDemandNext7d).toBe(120);
      expect(result.predictedDemandNext30d).toBe(480);
      expect(result.safetyStock).toBe(36);
      expect(result.reorderPoint).toBe(120);
      expect(result.daysUntilStockout).toBe(5);
      expect(result.reasons).toEqual(['Stock below reorder point']);
    });

    it('logs activity on AI reorder suggestion', async () => {
      mockAxiosPost.mockResolvedValue(aiResponse);

      await service.getReorderSuggestion(TENANT_ID, USER_ID, PRODUCT_ID, 50);

      expect(mockActivityService.log).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        'created',
        'inventory',
        PRODUCT_ID,
        expect.objectContaining({ type: 'ai_reorder_suggestion' }),
      );
    });

    it('falls back to calculated suggestion on axios error', async () => {
      mockAxiosPost.mockRejectedValue(new Error('AI service unavailable'));
      mockForecastService.getMonthlyDemand.mockResolvedValue({
        predictions: Array.from({ length: 30 }, (_, i) => ({ quantity: 10, date: `2025-06-${String(i + 1).padStart(2, '0')}` })),
      });

      const result = await service.getReorderSuggestion(TENANT_ID, USER_ID, PRODUCT_ID, 200);

      expect(result.shouldReorder).toBe(false);
      expect(result.reasons[0]).toContain('sufficient');
    });
  });
});
