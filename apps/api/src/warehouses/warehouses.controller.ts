import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Request, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WarehousesService, CreateWarehouseDto } from './warehouses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Warehouses')
@UseGuards(JwtAuthGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @ApiOperation({ summary: 'Create warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request payload.' })
  @Post()
  create(@Request() req: any, @Body() dto: CreateWarehouseDto) {
    return this.warehousesService.create(req.user.tenantId, dto);
  }

  @ApiOperation({ summary: 'List warehouses' })
  @ApiResponse({ status: 200, description: 'List of warehouses returned.' })
  @Get()
  findAll(@Request() req: any) {
    return this.warehousesService.findAll(req.user.tenantId);
  }

  @ApiOperation({ summary: 'Get default warehouse' })
  @ApiResponse({ status: 200, description: 'Default warehouse returned.' })
  @Get('default')
  findDefault(@Request() req: any) {
    return this.warehousesService.findDefault(req.user.tenantId);
  }

  @ApiOperation({ summary: 'Get warehouse by id' })
  @ApiResponse({ status: 200, description: 'Warehouse found.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.warehousesService.findOne(req.user.tenantId, id);
  }

  @ApiOperation({ summary: 'Update warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request payload.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateWarehouseDto>,
  ) {
    return this.warehousesService.update(req.user.tenantId, id, dto);
  }

  @ApiOperation({ summary: 'Delete warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  @Delete(':id')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.warehousesService.remove(req.user.tenantId, id);
  }
}
