import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, Request, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { LotsService } from './lots.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('inventory/lots')
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  @Post()
  create(@Request() req: any, @Body() body: any) {
    return this.lotsService.create(req.user.tenantId, body);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('includeExpired') includeExpired?: string,
  ) {
    return this.lotsService.findAll(req.user.tenantId, {
      productId,
      warehouseId,
      includeExpired: includeExpired === 'true',
    });
  }

  @Get('expiring-soon')
  getExpiringSoon(@Request() req: any, @Query('days') days?: string) {
    return this.lotsService.getExpiringSoon(
      req.user.tenantId,
      days ? parseInt(days) : 30,
    );
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.lotsService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
  ) {
    return this.lotsService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.lotsService.remove(req.user.tenantId, id);
  }
}