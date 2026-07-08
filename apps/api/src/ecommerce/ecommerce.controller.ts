import { Controller, Post, Get, Body, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { EcommerceService } from './ecommerce.service';
import { CreateStoreDto } from './dto/create-store.dto';

@Controller('ecommerce')
@UseGuards(JwtAuthGuard)
export class EcommerceController {
  constructor(private readonly ecommerceService: EcommerceService) {}

  // existing endpoints omitted

  @Get('stores')
  async getStores(@CurrentUser() user: any) {
    return this.ecommerceService.getStores(user.tenantId);
  }

  @Post('stores')
  async createStore(@CurrentUser() user: any, @Body() dto: CreateStoreDto) {
    return this.ecommerceService.createStore(user.tenantId, dto);
  }

  @Post('sync/all')
  async syncAll(@CurrentUser() user: any) {
    return this.ecommerceService.syncAllStores(user.tenantId);
  }

  @Post('stores/:storeId/sync')
  async syncStore(@Param('storeId') storeId: string, @CurrentUser() user: any) {
    return this.ecommerceService.syncAllStores(user.tenantId, storeId);
  }

  @Get('logs')
  async getSyncLogs(@CurrentUser() user: any, @Query('storeId') storeId?: string) {
    return this.ecommerceService.getSyncLogs(user.tenantId, storeId);
  }
}
