import { Controller, Get, Post, Body, Param, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversation/:userId')
  async getConversation(@Request() req: any, @Param('userId', ParseUUIDPipe) userId: string) {
    const items = await this.chatService.getConversation(req.user.tenantId, req.user.sub, userId);
    return { items };
  }

  @Post('send')
  async sendMessage(
    @Request() req: any,
    @Body() body: { toUserId: string; content: string }
  ) {
    const msg = await this.chatService.sendMessage(
      req.user.tenantId,
      req.user.sub,
      body.toUserId,
      body.content
    );
    return msg;
  }

  @Post('read/:messageId')
  async markRead(
    @Request() req: any,
    @Param('messageId', ParseUUIDPipe) messageId: string
  ) {
    await this.chatService.markAsRead(req.user.tenantId, messageId, req.user.sub);
    return { success: true };
  }

  @Get('unread')
  async getUnreadCount(@Request() req: any) {
    const count = await this.chatService.getUnreadCount(req.user.tenantId, req.user.sub);
    return { unreadCount: count };
  }
}
