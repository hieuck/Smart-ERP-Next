import { Controller, Get, Post, Patch, Delete, UseGuards, Request, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { ManufacturingService } from './manufacturing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CreateBomItemDto,
  CreateProductionOrderDto,
  UpdateQCCheckpointDto,
  CalculateCostDto,
  ReportProgressDto,
  AddRoutingStepDto,
} from './dto';

@ApiTags('Manufacturing')
@Controller('manufacturing')
@UseGuards(JwtAuthGuard)
export class ManufacturingController {
  constructor(private readonly service: ManufacturingService) {}

  @ApiOperation({ summary: 'Get BOM for a product' })
  @Get('bom/:productId')
  async getBOM(@Request() req: any, @Param('productId', ParseUUIDPipe) productId: string) {
    return this.service.getBOM(productId, req.user.tenantId);
  }

  @ApiOperation({ summary: 'Add BOM item' })
  @Post('bom')
  async addBOMItem(@Request() req: any, @Body() body: CreateBomItemDto) {
    return this.service.addBOMItem(req.user.tenantId, body.productId, body);
  }

  @ApiOperation({ summary: 'List production orders' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'in_progress', 'completed', 'cancelled'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @Get('orders')
  async listOrders(@Request() req: any, @Query('status') status?: string, @Query('page') page?: number) {
    return this.service.listProductionOrders(req.user.tenantId, status, 20, Number(page) || 1);
  }

  @ApiOperation({ summary: 'Create production order' })
  @Post('orders')
  async createOrder(@Request() req: any, @Body() body: CreateProductionOrderDto) {
    return this.service.createProductionOrder(req.user.tenantId, req.user.sub, body);
  }

  @ApiOperation({ summary: 'Start production' })
  @Patch('orders/:id/start')
  async startOrder(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.startProduction(req.user.tenantId, id, req.user.sub);
  }

  @ApiOperation({ summary: 'Complete production' })
  @Patch('orders/:id/complete')
  async completeOrder(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.completeProduction(req.user.tenantId, id, req.user.sub);
  }

  @ApiOperation({ summary: 'Report production progress' })
  @Patch('orders/:id/progress')
  async reportProgress(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReportProgressDto,
  ) {
    return this.service.reportProductionProgress(req.user.tenantId, id, body);
  }

  @ApiOperation({ summary: 'Get production order details' })
  @Get('orders/:id')
  async getOrder(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getProductionOrderById(req.user.tenantId, id);
  }

  @ApiOperation({ summary: 'Get QC checkpoints for an order' })
  @Get('orders/:id/qc')
  async getQCCheckpoints(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getQCCheckpoints(id, req.user.tenantId);
  }

  @ApiOperation({ summary: 'Update QC checkpoint' })
  @Patch('orders/:id/qc/:checkpointId')
  async updateQCCheckpoint(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Param('checkpointId', ParseUUIDPipe) checkpointId: string,
    @Body() body: UpdateQCCheckpointDto,
  ) {
    return this.service.updateQCCheckpoint(orderId, checkpointId, body.status, body.notes, req.user.tenantId);
  }

  @ApiOperation({ summary: 'Calculate production cost' })
  @Get('cost/:productId')
  async calculateCost(@Request() req: any, @Param('productId', ParseUUIDPipe) productId: string, @Query('quantity') quantity: string) {
    return this.service.calculateProductionCost(req.user.tenantId, productId, Number(quantity));
  }

  @ApiOperation({ summary: 'Calculate variance analysis for a production order' })
  @Get('orders/:id/variance')
  async calculateVariance(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.calculateVarianceAnalysis(req.user.tenantId, id);
  }

  // ─── Routing Operations ───────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get routing steps for a product' })
  @Get('routing/:productId')
  async getRouting(@Request() req: any, @Param('productId', ParseUUIDPipe) productId: string) {
    return this.service.getRoutingSteps(productId, req.user.tenantId);
  }

  @ApiOperation({ summary: 'Add routing step' })
  @Post('routing')
  async addRoutingStep(@Request() req: any, @Body() body: AddRoutingStepDto) {
    return this.service.addRoutingStep(req.user.tenantId, body);
  }

  @ApiOperation({ summary: 'Delete routing step' })
  @Delete('routing/:id')
  async removeRoutingStep(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeRoutingStep(req.user.tenantId, id);
  }
}