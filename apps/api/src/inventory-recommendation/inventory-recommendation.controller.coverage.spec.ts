import { BadRequestException } from '@nestjs/common';
import { InventoryRecommendationController } from './inventory-recommendation.controller';

describe('InventoryRecommendationController coverage', () => {
  const req = {
    user: {
      sub: 'user-1',
      tenantId: 'tenant-1',
    },
  };

  it('rejects GET suggestions without productId', async () => {
    const service = {
      getRecommendation: jest.fn(),
      getReorderSuggestion: jest.fn(),
    };
    const controller = new InventoryRecommendationController(service as any);

    await expect(controller.suggest(req, '', '10')).rejects.toBeInstanceOf(BadRequestException);
    expect(service.getRecommendation).not.toHaveBeenCalled();
  });

  it('delegates GET and POST reorder suggestions with parsed defaults', async () => {
    const service = {
      getRecommendation: jest.fn().mockResolvedValue({ suggestedReorder: 0 }),
      getReorderSuggestion: jest.fn().mockResolvedValue({ shouldReorder: false }),
    };
    const controller = new InventoryRecommendationController(service as any);

    await expect(controller.suggest(req, 'product-1', '')).resolves.toEqual({ suggestedReorder: 0 });
    await expect(controller.suggestReorder(req, { productId: 'product-1', currentStock: 5 })).resolves.toEqual({
      shouldReorder: false,
    });

    expect(service.getRecommendation).toHaveBeenCalledWith('tenant-1', 'user-1', 'product-1', 0);
    expect(service.getReorderSuggestion).toHaveBeenCalledWith('tenant-1', 'user-1', 'product-1', 5);
  });
});
