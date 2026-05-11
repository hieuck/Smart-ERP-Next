import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { comments } from '@smart-erp/database/schema';
import { eq, and, desc } from '@smart-erp/database/drizzle';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class CommentsService {
  constructor(private notificationsGateway: NotificationsGateway) {}

  async getByOrder(tenantId: string, orderId: string) {
    const rows = await db
      .select()
      .from(comments)
      .where(and(eq(comments.tenantId, tenantId), eq(comments.orderId, orderId)))
      .orderBy(desc(comments.createdAt))
      .limit(50)
      .leftJoin(users, eq(comments.userId, users.id));
    // Fetch user names separately if needed
    return rows;
  }

  async add(
    tenantId: string,
    orderId: string,
    userId: string,
    content: string,
    mentions: string[] = [],
  ) {
    const [newComment] = await db
      .insert(comments)
      .values({
        tenantId,
        orderId,
        userId,
        content,
        mentions,
      })
      .returning();
    // Broadcast to all users in the tenant (or specific mentions)
    this.notificationsGateway.broadcastToTenant(tenantId, 'comment.added', {
      orderId,
      comment: newComment,
    });
    return newComment;
  }

  async delete(tenantId: string, commentId: string, userId: string): Promise<void> {
    const [existing] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.tenantId, tenantId)));
    if (!existing) throw new NotFoundException('Comment not found');
    if (existing.userId !== userId) throw new NotFoundException('Not authorized');
    await db.delete(comments).where(eq(comments.id, commentId));
  }
}
