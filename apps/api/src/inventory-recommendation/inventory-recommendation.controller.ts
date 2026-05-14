import { Controller, Get, Query } from '@nestjs/common';
import { InventoryRecommendationService } from './inventory-recommendation.service';

@Controller('inventory-recommendation')
export class InventoryRecommendationController {
  constructor(private readonly service: InventoryRecommendationService) {}

  @Get('suggest')
  async suggest(@Query('productId') productId: string, @Query('stock') stock: string) {
    const currentStock = Number(stock) || 0;
    return this.service.getRecommendation(productId, currentStock);
  }
}
