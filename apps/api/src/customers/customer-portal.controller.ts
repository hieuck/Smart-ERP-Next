import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CustomerPortalService } from './customer-portal.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

const EMPTY_CUSTOMER_ID = '00000000-0000-0000-0000-000000000000';

@ApiTags('Customer Portal')
@UseGuards(JwtAuthGuard)
@Controller('portal')
export class CustomerPortalController {
  constructor(private readonly service: CustomerPortalService) {}

  @ApiOperation({ summary: 'Get my orders' })
  @Get('orders')
  getOrders(@Request() req: any) {
    const customerId = req.user.customerId || EMPTY_CUSTOMER_ID;
    return this.service.getOrders(req.user.tenantId, customerId);
  }

  @ApiOperation({ summary: 'Track an order' })
  @Get('orders/:id/track')
  trackOrder(@Request() req: any, @Param('id') id: string) {
    return this.service.getOrderTracking(req.user.tenantId, id);
  }

  @ApiOperation({ summary: 'Get my support tickets' })
  @Get('tickets')
  getTickets(@Request() req: any) {
    const customerId = req.user.customerId || EMPTY_CUSTOMER_ID;
    return this.service.getTickets(req.user.tenantId, customerId);
  }

  @ApiOperation({ summary: 'Create a support ticket' })
  @Post('tickets')
  createTicket(@Request() req: any, @Body() body: any) {
    const customerId = req.user.customerId || EMPTY_CUSTOMER_ID;
    return this.service.createTicket(req.user.tenantId, customerId, body);
  }

  @ApiOperation({ summary: 'Get my invoices' })
  @Get('invoices')
  getInvoices(@Request() req: any) {
    const customerId = req.user.customerId || EMPTY_CUSTOMER_ID;
    return this.service.getInvoices(req.user.tenantId, customerId);
  }
}
