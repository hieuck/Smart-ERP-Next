import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { MarkReadDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getUserNotifications(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findByUser(tenantId, userId, limit ? parseInt(limit) : 50);
  }

  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const count = await this.notificationsService.getUnreadCount(tenantId, userId);
    return { unreadCount: count };
  }

  @Post('mark-read')
  async markAsRead(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: MarkReadDto,
  ) {
    await this.notificationsService.markAsRead(tenantId, dto.notificationId, userId);
    return { success: true };
  }

  @Post('mark-all-read')
  async markAllAsRead(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.notificationsService.markAllAsRead(tenantId, userId);
    return { success: true };
  }

  @Delete(':id')
  async deleteNotification(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    await this.notificationsService.delete(tenantId, id, userId);
    return { success: true };
  }
}
