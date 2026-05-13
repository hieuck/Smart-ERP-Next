import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, Request, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('inventory/transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  create(@Request() req: any, @Body() body: any) {
    return this.transfersService.create(req.user.tenantId, req.user.sub, body);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('fromWarehouseId') fromWarehouseId?: string,
    @Query('toWarehouseId') toWarehouseId?: string,
  ) {
    return this.transfersService.findAll(req.user.tenantId, { status, fromWarehouseId, toWarehouseId });
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.transfersService.findOne(req.user.tenantId, id);
  }

  @Patch(':id/approve')
  approve(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.transfersService.approve(req.user.tenantId, req.user.sub, id);
  }

  @Patch(':id/ship')
  ship(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { items: { itemId: string; quantityShipped: number }[] },
  ) {
    return this.transfersService.ship(req.user.tenantId, id, body.items);
  }

  @Patch(':id/receive')
  receive(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { items: { itemId: string; quantityReceived: number }[] },
  ) {
    return this.transfersService.receive(req.user.tenantId, id, body.items);
  }

  @Patch(':id/cancel')
  cancel(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.transfersService.cancel(req.user.tenantId, id);
  }
}