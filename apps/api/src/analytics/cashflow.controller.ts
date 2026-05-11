import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CashflowForecastService } from './cashflow-forecast.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('analytics/cashflow')
@UseGuards(JwtAuthGuard)
export class CashflowController {
  constructor(private readonly cashflowService: CashflowForecastService) {}

  @Get('forecast')
  async getForecast(
    @CurrentUser() user: { tenantId: string; sub: string },
    @Query('days') days?: string,
  ) {
    const forecastDays = Math.min(parseInt(days) || 30, 90);
    const result = await this.cashflowService.forecast(user.tenantId, forecastDays);
    return result;
  }
}
