import { Controller, Post, Get, Body, Query, Param, UseGuards } from '@nestjs/common';
import { QmsService } from './qms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('qms')
@UseGuards(JwtAuthGuard)
export class QmsController {
  constructor(private readonly qmsService: QmsService) {}

  // Plans
  @Post('plans')
  async createPlan(@CurrentUser() user: any, @Body() body: any) {
    return this.qmsService.createPlan({ ...body, tenantId: user.tenantId });
  }

  @Get('plans')
  async getPlans(@CurrentUser() user: any, @Query('productId') productId?: string) {
    return this.qmsService.getPlans(user.tenantId, productId);
  }

  // Characteristics
  @Post('plans/:planId/characteristics')
  async addCharacteristic(@Param('planId') planId: string, @Body() body: any) {
    return this.qmsService.addCharacteristic(planId, body);
  }

  // Inspections
  @Post('inspections')
  async recordInspection(@CurrentUser() user: any, @Body() body: any) {
    const { results, ...inspectionData } = body;
    return this.qmsService.recordInspection({ ...inspectionData, tenantId: user.tenantId }, results);
  }

  @Get('inspections')
  async getInspections(@CurrentUser() user: any, @Query('referenceType') referenceType?: string, @Query('referenceId') referenceId?: string) {
    return this.qmsService.getInspections(user.tenantId, referenceType, referenceId);
  }

  // Defect codes
  @Post('defect-codes')
  async createDefectCode(@CurrentUser() user: any, @Body() body: any) {
    return this.qmsService.createDefectCode({ ...body, tenantId: user.tenantId });
  }

  @Get('defect-codes')
  async getDefectCodes(@CurrentUser() user: any) {
    return this.qmsService.getDefectCodes(user.tenantId);
  }

  // Reports
  @Get('report')
  async getQualityReport(@CurrentUser() user: any, @Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.qmsService.getQualityReport(user.tenantId, new Date(startDate), new Date(endDate));
  }
}
