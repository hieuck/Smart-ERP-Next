import { Controller, Get, Param, UseGuards, Request, Res, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../common/errors/error-codes';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrintService } from './print.service';

@Controller('print')
@UseGuards(JwtAuthGuard)
export class PrintController {
  constructor(private readonly printService: PrintService) {}

  @Get('invoice/:id')
  async printInvoice(@Request() req: any, @Param('id') id: string, @Res() res: Response) {
    try {
      const html = await this.printService.renderInvoice(req.user.tenantId, id);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch {
      throw new NotFoundException({ message: 'Invoice not found', errorCode: ErrorCode.INVOICE_NOT_FOUND });
    }
  }

  @Get('purchase-order/:id')
  async printPurchaseOrder(@Request() req: any, @Param('id') id: string, @Res() res: Response) {
    try {
      const html = await this.printService.renderPurchaseOrder(req.user.tenantId, id);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch {
      throw new NotFoundException({ message: 'Purchase order not found', errorCode: ErrorCode.PURCHASE_ORDER_NOT_FOUND });
    }
  }
}
