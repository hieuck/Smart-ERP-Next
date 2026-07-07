import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, UsePipes, Request, ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PaginationParamsDto } from '../common/dto/pagination-params.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }))
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(req.user.tenantId, dto);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query() pagination: PaginationParamsDto,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.suppliersService.findAll(req.user.tenantId, {
      page: pagination.page,
      limit: pagination.limit,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.suppliersService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.suppliersService.remove(req.user.tenantId, id);
  }
}
