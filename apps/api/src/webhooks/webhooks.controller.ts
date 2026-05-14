import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { WebhooksService, WebhookEvent } from './webhooks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post('subscribe')
  subscribe(@Request() req: any, @Body() body: { url: string; events: WebhookEvent[]; secret?: string }) {
    return this.service.subscribe(req.user.tenantId, body.url, body.events, body.secret);
  }

  @Get()
  listSubscriptions(@Request() req: any) {
    return this.service.listSubscriptions(req.user.tenantId);
  }

  @Delete(':id')
  unsubscribe(@Request() req: any, @Param('id') id: string) {
    return this.service.unsubscribe(req.user.tenantId, id);
  }

  @Get('logs/:subscriptionId')
  getDeliveryLogs(@Request() req: any, @Param('subscriptionId') id: string, @Query('limit') limit?: string) {
    return this.service.getDeliveryLogs(req.user.tenantId, id, Number(limit) || 50);
  }
}