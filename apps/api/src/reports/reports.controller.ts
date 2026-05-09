import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('user-registrations')
  async getUserRegistrations(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.reportsService.getUserRegistrationsByDay(daysNum);
  }

  @Get('tenant-stats')
  async getTenantStats() {
    return this.reportsService.getTenantStats();
  }
}