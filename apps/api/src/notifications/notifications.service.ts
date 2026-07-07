import { Injectable, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { notifications, users, NewNotification, Notification } from '@smart-erp/database';
import { eq, and, desc, sql } from 'drizzle-orm';

@Injectable()
export class NotificationsService {
  constructor(private drizzle: DrizzleService) {}

  async create(tenantId: string, data: Omit<NewNotification, 'tenantId' | 'id'>): Promise<Notification> {
    const user = await this.drizzle.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, data.userId), eq(users.tenantId, tenantId)))
      .limit(1);
    if (user.length === 0) {
      throw new BadRequestException('User does not belong to this tenant');
    }

    const [notification] = await this.drizzle.db
      .insert(notifications)
      .values({ ...data, tenantId })
      .returning();
    return notification;
  }

  async findByUser(tenantId: string, userId: string, limit = 50): Promise<Notification[]> {
    return this.drizzle.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.tenantId, tenantId), eq(notifications.userId, userId)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markAsRead(tenantId: string, notificationId: string, userId: string): Promise<void> {
    await this.drizzle.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      );
  }

  async markAllAsRead(tenantId: string, userId: string): Promise<void> {
    await this.drizzle.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.tenantId, tenantId), eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async delete(tenantId: string, notificationId: string, userId: string): Promise<void> {
    await this.drizzle.db
      .delete(notifications)
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      );
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    const result = await this.drizzle.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.tenantId, tenantId), eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result[0]?.count || 0;
  }
}
