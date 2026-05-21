// @ts-nocheck
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { HelpdeskService } from '../services/helpdesk.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('helpdesk')
export class HelpdeskController {
  constructor(private readonly helpdeskService: HelpdeskService) {}

  @Post('tickets')
  createTicket(@Request() req: any, @Body() dto: any) {
    return this.helpdeskService.createTicket(req.user.tenantId, req.user.sub, dto);
  }

  @Get('tickets')
  findAll(@Request() req: any, @Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: string, @Query('priority') priority?: string, @Query('assigneeId') assigneeId?: string, @Query('customerId') customerId?: string) {
    return this.helpdeskService.findAll(req.user.tenantId, { page: page ? parseInt(page) : undefined, limit: limit ? parseInt(limit) : undefined, status, priority, assigneeId: assigneeId ? parseInt(assigneeId) : undefined, customerId: customerId ? parseInt(customerId) : undefined });
  }

  @Get('tickets/:id')
  findOne(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.helpdeskService.findOne(req.user.tenantId, id);
  }

  @Patch('tickets/:id/status')
  updateStatus(@Request() req: any, @Param('id', ParseIntPipe) id: number, @Body('status') status: string) {
    return this.helpdeskService.updateStatus(req.user.tenantId, req.user.sub, id, status);
  }

  @Patch('tickets/:id/assign')
  assign(@Request() req: any, @Param('id', ParseIntPipe) id: number, @Body('assigneeId', ParseIntPipe) assigneeId: number) {
    return this.helpdeskService.assignTicket(req.user.tenantId, req.user.sub, id, assigneeId);
  }

  @Post('tickets/:id/comments')
  addComment(@Request() req: any, @Param('id', ParseIntPipe) ticketId: number, @Body('content') content: string, @Body('isInternal') isInternal?: boolean) {
    return this.helpdeskService.addComment(req.user.tenantId, req.user.sub, ticketId, content, isInternal);
  }

  @Get('tickets/:id/comments')
  getComments(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.helpdeskService.getComments(req.user.tenantId, id);
  }

  @Get('tickets/:id/history')
  getHistory(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.helpdeskService.getHistory(req.user.tenantId, id);
  }

  @Get('stats')
  getStats(@Request() req: any) {
    return this.helpdeskService.getStats(req.user.tenantId);
  }
}