import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Request, ParseUUIDPipe,
} from '@nestjs/common';
import { WarehousesService, CreateWarehouseDto } from './warehouses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateWarehouseDto) {
    return this.warehousesService.create(req.user.tenantId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.warehousesService.findAll(req.user.tenantId);
  }

  @Get('default')
  findDefault(@Request() req: any) {
    return this.warehousesService.findDefault(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.warehousesService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateWarehouseDto>,
  ) {
    return this.warehousesService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.warehousesService.remove(req.user.tenantId, id);
  }
}
