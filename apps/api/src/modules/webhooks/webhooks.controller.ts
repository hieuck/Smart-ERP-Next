import { Controller, Get, Post, Body, Patch, Delete, Param, Req, UseGuards } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.webhooksService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.webhooksService.findOne(id, req.user.tenantId);
  }

  @Post()
  create(@Body() body: any, @Req() req: RequestWithUser) {
    return this.webhooksService.create(body, req.user.tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: RequestWithUser) {
    return this.webhooksService.update(id, body, req.user.tenantId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.webhooksService.delete(id, req.user.tenantId);
  }

  @Get(':id/logs')
  getLogs(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.webhooksService.getDeliveryLogs(id, req.user.tenantId);
  }
}
