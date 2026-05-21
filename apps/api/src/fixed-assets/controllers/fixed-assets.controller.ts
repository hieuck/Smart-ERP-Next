// @ts-nocheck
import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { FixedAssetsService } from '../services/fixed-assets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('fixed-assets')
export class FixedAssetsController {
  constructor(private readonly fixedAssetsService: FixedAssetsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: any) {
    return this.fixedAssetsService.create(req.user.tenantId, dto);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.fixedAssetsService.findAll(req.user.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      category,
      status,
    });
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.fixedAssetsService.findOne(req.user.tenantId, id);
  }

  @Post('run-depreciation')
  runDepreciation(@Request() req: any) {
    return this.fixedAssetsService.runMonthlyDepreciation(req.user.tenantId);
  }

  @Post(':id/dispose')
  dispose(@Request() req: any, @Param('id') id: string) {
    return this.fixedAssetsService.dispose(req.user.tenantId, id);
  }
}