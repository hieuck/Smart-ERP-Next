import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IdempotencyGuard } from '../common/errors/idempotency.guard';
import { AuditLog } from '../common/decorators/audit-log.decorator';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(IdempotencyGuard)
  create(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.tenantId, req.user.sub, dto);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('channel') channel?: string,
  ) {
    return this.ordersService.findAll(req.user.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status,
      paymentStatus,
      channel,
    });
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(req.user.tenantId, id);
  }

  @Get(':id/einvoice')
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
  updateStatus(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: string; cancelReason?: string },
  ) {
    return this.ordersService.updateStatus(req.user.tenantId, req.user.sub, id, body.status, body.cancelReason);
  }
}
