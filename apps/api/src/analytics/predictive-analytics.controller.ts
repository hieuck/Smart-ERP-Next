import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { PredictiveAnalyticsService } from './predictive-analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('analytics/predictive')
@UseGuards(JwtAuthGuard)
export class PredictiveAnalyticsController {
  constructor(private readonly service: PredictiveAnalyticsService) {}

  @Get('clv')
  async getCLVScores(@Request() req: any) {
    return this.service.calculateCLVScores(req.user.tenantId);
  }

  @Get('trend')
  async getSalesTrend(@Request() req: any, @Query('weeks') weeks?: string) {
    return this.service.getSalesTrend(req.user.tenantId, Number(weeks) || 12);
  }

  @Get('at-risk')
  async getAtRiskCustomers(@Request() req: any) {
    return this.service.getAtRiskCustomers(req.user.tenantId);
  }
}