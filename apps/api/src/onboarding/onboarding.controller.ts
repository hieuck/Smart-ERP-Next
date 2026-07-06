import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { SetupCompanyDto } from './dto/setup-company.dto';
import { SeedIndustryDto } from './dto/seed-industry.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  private resolveTenantId(req: any): string {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  }

  @Get('status')
  async getStatus(@Request() req: any) {
    return this.service.getStatus(this.resolveTenantId(req));
  }

  @Post('company')
  async setupCompany(@Request() req: any, @Body() dto: SetupCompanyDto) {
    return this.service.setupCompany(this.resolveTenantId(req), dto);
  }

  @Post('seed')
  async seedIndustryData(@Request() req: any, @Body() dto: SeedIndustryDto) {
    return this.service.seedIndustryData(this.resolveTenantId(req), dto.industry);
  }

  @Post('complete')
  async complete(@Request() req: any) {
    return this.service.complete(this.resolveTenantId(req));
  }
}
