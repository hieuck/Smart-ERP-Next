import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get()
  getKPIs(@Request() req: any) {
    return this.service.getKPIs(req.user.tenantId);
  }

  @Get('chart')
  getRevenueChart(@Request() req: any, @Query('period') period?: string) {
    return this.service.getRevenueChart(req.user.tenantId, period as any);
  }

  @Get('top-products')
  getTopProducts(@Request() req: any, @Query('limit') limit?: string) {
    return this.service.getTopProducts(req.user.tenantId, limit ? parseInt(limit) : 10);
  }
}
