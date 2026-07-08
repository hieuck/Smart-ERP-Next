import { Controller, Get, Post, Body, Param, UseGuards, Request, ForbiddenException, ParseUUIDPipe } from '@nestjs/common';
import { CustomerPortalService } from './customer-portal.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateTicketDto } from './dto/create-ticket.dto';

function requireCustomerId(req: any): string {
  const customerId: string | undefined = req.user?.customerId;
  if (!customerId) {
    throw new ForbiddenException('Customer profile is required to access the portal.');
  }
  return customerId;
}

@ApiTags('Customer Portal')
@UseGuards(JwtAuthGuard)
@Controller('portal')
export class CustomerPortalController {
  constructor(private readonly service: CustomerPortalService) {}

  @ApiOperation({ summary: 'Get my orders' })
  @Get('orders')
  getOrders(@Request() req: any) {
    const customerId = requireCustomerId(req);
    return this.service.getOrders(req.user.tenantId, customerId);
  }

  @ApiOperation({ summary: 'Track an order' })
  @Get('orders/:id/track')
  trackOrder(@Request() req: any, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.service.getOrderTracking(req.user.tenantId, id);
  }

  @ApiOperation({ summary: 'Get my support tickets' })
  @Get('tickets')
  getTickets(@Request() req: any) {
    const customerId = requireCustomerId(req);
    return this.service.getTickets(req.user.tenantId, customerId);
  }

  @ApiOperation({ summary: 'Create a support ticket' })
  @Post('tickets')
  createTicket(@Request() req: any, @Body() body: CreateTicketDto) {
    const customerId = requireCustomerId(req);
    return this.service.createTicket(req.user.tenantId, customerId, body);
  }

  @ApiOperation({ summary: 'Get my invoices' })
  @Get('invoices')
  getInvoices(@Request() req: any) {
    const customerId = requireCustomerId(req);
    return this.service.getInvoices(req.user.tenantId, customerId);
  }
}
