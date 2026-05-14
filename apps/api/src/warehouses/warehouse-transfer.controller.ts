import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { WarehouseTransferService } from './warehouse-transfer.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('warehouse-transfers')
@UseGuards(JwtAuthGuard)
export class WarehouseTransferController {
  constructor(private readonly service: WarehouseTransferService) {}

  @Post()
  async create(
    @Request() req: any,
    @Body() body: { fromWarehouseId: string; toWarehouseId: string; items: { productId: string; quantity: number }[]; notes?: string },
  ) {
    return this.service.createTransfer(
      req.user.tenantId,
      req.user.sub,
      body.fromWarehouseId,
      body.toWarehouseId,
      body.items,
      body.notes,
    );
  }

  @Patch(':id/confirm')
  async confirm(@Request() req: any, @Param('id') id: string) {
    return this.service.confirmTransfer(req.user.tenantId, id);
  }

  @Patch(':id/receive')
  async receive(@Request() req: any, @Param('id') id: string) {
    return this.service.receiveTransfer(req.user.tenantId, id, req.user.sub);
  }

  @Get(':id')
  async getById(@Request() req: any, @Param('id') id: string) {
    return this.service.getTransferById(req.user.tenantId, id);
  }

  @Get()
  async list(@Request() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.listTransfers(req.user.tenantId, Number(page) || 1, Number(limit) || 20);
  }
}