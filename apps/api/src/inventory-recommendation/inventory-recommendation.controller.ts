import { BadRequestException, Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { InventoryRecommendationService } from './inventory-recommendation.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class ReorderSuggestionDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Current stock level' })
  @IsNumber()
  @Min(0)
  currentStock: number;
}

@Controller('inventory-recommendation')
export class InventoryRecommendationController {
  constructor(private readonly service: InventoryRecommendationService) {}

  @UseGuards(JwtAuthGuard)
  @Get('suggest')
  async suggest(
    @Request() req: any,
    @Query('productId') productId: string,
    @Query('stock') stock: string,
  ) {
    if (!productId) {
      throw new BadRequestException('productId is required');
    }
    const currentStock = Number(stock) || 0;
    return this.service.getRecommendation(req.user.tenantId, req.user.sub, productId, currentStock);
  }

  @UseGuards(JwtAuthGuard)
  @Post('suggest')
  async suggestReorder(
    @Request() req: any,
    @Body() dto: ReorderSuggestionDto,
  ) {
    return this.service.getReorderSuggestion(
      req.user.tenantId,
      req.user.sub,
      dto.productId,
      dto.currentStock,
    );
  }
}
