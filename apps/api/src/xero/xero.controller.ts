import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { XeroService } from './xero.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('xero')
@UseGuards(JwtAuthGuard)
export class XeroController {
  constructor(private readonly xeroService: XeroService) {}

  @Post('connect')
  async connect(@CurrentUser() user: any, @Body() body: any) {
    await this.xeroService.saveConnection(user.tenantId, body);
    return { message: 'Xero connection saved' };
  }

  @Get('status')
  async status(@CurrentUser() user: any) {
    const conn = await this.xeroService.getConnection(user.tenantId);
    return { connected: !!conn, lastSync: conn?.lastSyncAt };
  }

  @Post('sync')
  async sync(@CurrentUser() user: any, @Body() body: { type: 'customers' | 'invoices' | 'payments' }) {
    const conn = await this.xeroService.getConnection(user.tenantId);
    if (!conn) throw new Error('No Xero connection found');
    if (body.type === 'customers') await this.xeroService.syncCustomers(conn.id, conn);
    else if (body.type === 'invoices') await this.xeroService.syncInvoices(conn.id, conn);
    return { message: `Synced ${body.type}` };
  }
}
