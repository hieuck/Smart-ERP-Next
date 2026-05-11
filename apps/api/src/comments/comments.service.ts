import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async getByOrder(tenantId: string, orderId: string): Promise<Comment[]> {
    return this.commentRepo.find({
      where: { tenantId, orderId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async add(
    tenantId: string,
    orderId: string,
    userId: string,
    content: string,
    mentions: string[] = [],
  ): Promise<Comment> {
    const comment = this.commentRepo.create({
      tenantId,
      orderId,
      userId,
      content,
      mentions,
    });
    const saved = await this.commentRepo.save(comment);

    // Broadcast to all users in the tenant (or specific mentions)
    this.notificationsGateway.broadcastToTenant(tenantId, 'comment.added', {
      orderId,
      comment: { ...saved, user: await this.commentRepo.findOne({ where: { id: saved.id }, relations: ['user'] }) },
    });

    return saved;
  }

  async delete(tenantId: string, commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId, tenantId } });
    if (!comment) throw new Error('Comment not found');
    if (comment.userId !== userId) throw new Error('Not authorized to delete this comment');
    await this.commentRepo.remove(comment);
  }
}
