import {
  Controller,
  Get,
  UseGuards,
  Request,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('dashboard')
  async getDashboard(
    @Request() req: any,
    @Query('period') period?: string,
  ) {
    return this.accountingService.getDashboard(req.user.tenantId, period);
  }

  @Get('reports')
  async getReports(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('period') period?: string,
  ) {
    return this.accountingService.getReports(req.user.tenantId, type, period);
  }
}