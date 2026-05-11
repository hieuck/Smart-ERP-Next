import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ForecastService } from './forecast.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('analytics/forecast')
@UseGuards(JwtAuthGuard)
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Get('product/:productId')
  async getProductForecast(
    @CurrentUser() user: { tenantId: string; sub: string },
    @Param('productId') productId: string,
    @Query('days') days?: string,
  ) {
    const forecastDays = Math.min(parseInt(days) || 30, 90);
    const result = await this.forecastService.getDemandForecast(user.tenantId, productId, forecastDays);
    return result;
  }
}
