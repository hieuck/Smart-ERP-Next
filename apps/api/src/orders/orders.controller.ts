import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  Request,
  ParseUUIDPipe,
  Res,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IdempotencyGuard } from '../common/errors/idempotency.guard';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }))
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(IdempotencyGuard)
  @ApiOperation({ summary: 'Create a new order', description: 'Creates an order with line items, calculates totals, and broadcasts real-time notification' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or product not found' })
  create(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.tenantId, req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List orders', description: 'Paginated list with search/filter by status, channel, payment status' })
  @ApiResponse({ status: 200, description: 'Returns orders list with pagination metadata' })
  findAll(@Request() req: any, @Query() query: FindOrdersQueryDto) {
    return this.ordersService.findAll(req.user.tenantId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      paymentStatus: query.paymentStatus,
      channel: query.channel,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID', description: 'Returns order details with line items' })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(req.user.tenantId, id);
  }

  @Get(':id/einvoice')
  @ApiOperation({ summary: 'Generate e-invoice XML', description: 'Generates Vietnamese-standard e-invoice XML for an order' })
  @ApiResponse({ status: 200, description: 'XML invoice downloaded' })
  async generateEInvoice(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const xml = await this.ordersService.generateEInvoiceXml(req.user.tenantId, id);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.xml`);
    res.send(xml);
  }

  @Patch(':id/status')
  @AuditLog('update_order_status', 'order')
  @ApiOperation({ summary: 'Update order status', description: 'Transitions order through workflow: draft→confirmed→processing→shipped→delivered' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  updateStatus(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: string; cancelReason?: string },
  ) {
    return this.ordersService.updateStatus(req.user.tenantId, req.user.sub, id, body.status, body.cancelReason);
  }
}
