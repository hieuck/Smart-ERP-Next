import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { InventoryRecommendationService } from './inventory-recommendation.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('inventory-recommendation')
export class InventoryRecommendationController {
  constructor(private readonly service: InventoryRecommendationService) {}

  @UseGuards(JwtAuthGuard)
  @Get('suggest')
  async suggest(@Request() req: any, @Query('productId') productId: string, @Query('stock') stock: string) {
    const currentStock = Number(stock) || 0;
    return this.service.getRecommendation(req.user.tenantId, req.user.sub, productId, currentStock);
  }
}
