import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { SetupCompanyDto } from './dto/setup-company.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Get('status')
  async getStatus(@Request() req: any) {
    return this.service.getStatus(req.tenantId);
  }

  @Post('company')
  async setupCompany(@Request() req: any, @Body() dto: SetupCompanyDto) {
    return this.service.setupCompany(req.tenantId, dto);
  }

  @Post('seed')
  async seedIndustryData(@Request() req: any, @Body() body: { industry: 'retail' | 'fnb' | 'service' }) {
    return this.service.seedIndustryData(req.tenantId, body.industry);
  }

  @Post('complete')
  async complete(@Request() req: any) {
    return this.service.complete(req.tenantId);
  }
}
