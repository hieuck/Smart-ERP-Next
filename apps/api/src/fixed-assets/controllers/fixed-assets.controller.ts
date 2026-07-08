import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, ParseUUIDPipe, ValidationPipe } from '@nestjs/common';
import { FixedAssetsService } from '../services/fixed-assets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FindFixedAssetsQueryDto } from '../dto/find-fixed-assets-query.dto';
import { CreateFixedAssetDto } from '../dto/create-fixed-asset.dto';

@UseGuards(JwtAuthGuard)
@Controller('fixed-assets')
export class FixedAssetsController {
  constructor(private readonly fixedAssetsService: FixedAssetsService) {}

  @Post()
  create(@Request() req: any, @Body(new ValidationPipe()) dto: CreateFixedAssetDto) {
    return this.fixedAssetsService.create(req.user.tenantId, dto);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query(new ValidationPipe({ transform: true })) query: FindFixedAssetsQueryDto,
  ) {
    return this.fixedAssetsService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.fixedAssetsService.findOne(req.user.tenantId, id);
  }

  @Post('run-depreciation')
  runDepreciation(@Request() req: any) {
    return this.fixedAssetsService.runMonthlyDepreciation(req.user.tenantId);
  }

  @Post(':id/dispose')
  dispose(@Request() req: any, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.fixedAssetsService.dispose(req.user.tenantId, id);
  }
}
