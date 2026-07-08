import { Controller, Get, Post, UseGuards, Request, Param, Query, ParseUUIDPipe, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MRPService } from './mrp.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CalculateMRPQueryDto } from './dto/calculate-mrp-query.dto';

@ApiTags('MRP')
@Controller('mrp')
@UseGuards(JwtAuthGuard)
export class MRPController {
  constructor(private readonly mrpService: MRPService) {}

  @ApiOperation({ summary: 'Calculate MRP for a single product' })
  @ApiParam({ name: 'productId', type: String, format: 'uuid' })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number })
  @Get('calculate/:productId')
  async calculateMRP(
    @Request() req: any,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Query(new ValidationPipe({ transform: true })) query: CalculateMRPQueryDto,
  ) {
    return this.mrpService.calculateMRP(req.user.tenantId, productId, query.daysAhead ?? 30);
  }

  @ApiOperation({ summary: 'Run full MRP batch for all active products' })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number })
  @Post('calculate-batch')
  async calculateMRPBatch(
    @Request() req: any,
    @Query(new ValidationPipe({ transform: true })) query: CalculateMRPQueryDto,
  ) {
    return this.mrpService.calculateMRPBatch(req.user.tenantId, undefined, query.daysAhead ?? 30);
  }
}
