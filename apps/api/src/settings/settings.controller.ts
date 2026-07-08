import { Controller, Get, Patch, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SetDefaultCurrencyDto } from './dto/set-default-currency.dto';
import { UpdateTenantSettingsDto } from './dto/tenant-settings.dto';

function requireTenantId(req: any): string {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    throw new ForbiddenException('Tenant context is missing');
  }
  return tenantId;
}

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('register')
  async getRegisterSettings(@Request() req: any) {
    return this.service.getRegisterSettings(requireTenantId(req));
  }

  @Get('currency')
  async getDefaultCurrency(@Request() req: any) {
    return this.service.getDefaultCurrency(requireTenantId(req));
  }

  @Patch('currency')
  async setDefaultCurrency(@Request() req: any, @Body() dto: SetDefaultCurrencyDto) {
    return this.service.setDefaultCurrency(requireTenantId(req), dto.currency);
  }

  @Get('tenant')
  async getTenantSettings(@Request() req: any) {
    return this.service.getTenantSettings(requireTenantId(req));
  }

  @Patch('tenant')
  async updateTenantSettings(@Request() req: any, @Body() dto: UpdateTenantSettingsDto) {
    return this.service.updateTenantSettings(requireTenantId(req), dto);
  }
}
