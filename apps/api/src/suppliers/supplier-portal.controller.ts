import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { SupplierPortalService } from './supplier-portal.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Supplier Portal')
@UseGuards(JwtAuthGuard)
@Controller('supplier-portal')
export class SupplierPortalController {
  constructor(private readonly service: SupplierPortalService) {}

  @ApiOperation({ summary: 'Get my purchase orders' })
  @Get('orders')
  getOrders(@Request() req: any) {
    const supplierId = req.user.supplierId || 'dummy-supplier-id';
    return this.service.getPurchaseOrders(req.user.tenantId, supplierId);
  }

  @ApiOperation({ summary: 'Confirm shipment (ASN)' })
  @Post('orders/:id/ship')
  confirmShipment(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const supplierId = req.user.supplierId || 'dummy-supplier-id';
    return this.service.confirmShipment(req.user.tenantId, supplierId, id, body);
  }

  @ApiOperation({ summary: 'Submit quotation for RFQ' })
  @Post('rfqs/:id/quote')
  submitQuote(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const supplierId = req.user.supplierId || 'dummy-supplier-id';
    return this.service.submitQuotation(req.user.tenantId, supplierId, id, body);
  }
}
