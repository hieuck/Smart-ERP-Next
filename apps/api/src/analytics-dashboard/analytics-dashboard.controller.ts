import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsDashboardService } from './analytics-dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Analytics Dashboard')
@Controller('analytics-dashboard')
@UseGuards(JwtAuthGuard)
export class AnalyticsDashboardController {
  constructor(private readonly service: AnalyticsDashboardService) {}

  @ApiOperation({ summary: 'Get KPI metrics' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'week', 'month', 'quarter'] })
  @Get('kpis')
  async getKPIs(@Request() req: any, @Query('period') period?: string) {
    return this.service.getKPIs(req.user.tenantId, period as any || 'month');
  }

  @ApiOperation({ summary: 'Get revenue chart data' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @Get('revenue-chart')
  async getRevenueChart(@Request() req: any, @Query('days') days?: number) {
    return this.service.getRevenueChart(req.user.tenantId, days || 30);
  }

  @ApiOperation({ summary: 'Get top products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('top-products')
  async getTopProducts(@Request() req: any, @Query('limit') limit?: number) {
    return this.service.getTopProducts(req.user.tenantId, limit || 10);
  }

  @ApiOperation({ summary: 'Get AI-powered insights and anomaly detection' })
  @Get('ai-insights')
  async getAIInsights(@Request() req: any) {
    return this.service.getAIInsights(req.user.tenantId);
  }
}