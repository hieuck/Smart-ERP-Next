import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { messages } from '@smart-erp/database/schema';
import { eq, and, or, desc, sql } from '@smart-erp/database/drizzle';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class ChatService {
  constructor(private notificationsGateway: NotificationsGateway) {}

  async sendMessage(tenantId: string, fromUserId: string, toUserId: string, content: string, mentions?: string[]) {
    const [msg] = await db.insert(messages).values({
      tenantId,
      fromUserId,
      toUserId,
      content,
      mentions,
      sentAt: new Date(),
    }).returning();

    // Notify recipient via WebSocket
    this.notificationsGateway.sendToUser(toUserId, 'chat.message', {
      id: msg.id,
      fromUserId,
      content,
      mentions,
      sentAt: msg.sentAt,
    });

    // Notify mentioned users
    if (mentions?.length) {
      mentions.forEach((userId) => {
        this.notificationsGateway.sendToUser(userId, 'chat.mention', {
          id: msg.id,
          fromUserId,
          content,
          mentionedBy: fromUserId,
        });
      });
    }

    return msg;
  }

  async getConversation(tenantId: string, userId: string, otherUserId: string) {
    const conv = await db.select()
      .from(messages)
      .where(
        and(
          eq(messages.tenantId, tenantId),
          or(
            and(eq(messages.fromUserId, userId), eq(messages.toUserId, otherUserId)),
            and(eq(messages.fromUserId, otherUserId), eq(messages.toUserId, userId))
          )
        )
      )
      .orderBy(desc(messages.sentAt))
      .limit(100);
    return conv.reverse();
  }

  async markAsRead(tenantId: string, messageId: string, userId: string) {
    const [msg] = await db.update(messages)
      .set({ isRead: 'true' })
      .where(and(eq(messages.id, messageId), eq(messages.toUserId, userId), eq(messages.tenantId, tenantId)))
      .returning();
    if (!msg) throw new NotFoundException('Message not found');
    return msg;
  }

  async getUnreadCount(tenantId: string, userId: string) {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(
        eq(messages.tenantId, tenantId),
        eq(messages.toUserId, userId),
        eq(messages.isRead, 'false')
      ));
    return result[0]?.count || 0;
  }
}