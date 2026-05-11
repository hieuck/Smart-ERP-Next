import { Injectable } from '@nestjs/common';
import { InjectDatabase } from '../../database/database.decorator';
import { Database } from '../../database/database.module';
import { webhookSubscriptions, webhookDeliveryLogs, WebhookSubscription } from '@smart-erp/database';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class WebhooksService {
  constructor(@InjectDatabase() private db: Database) {}

  async findAll(tenantId: string) {
    return this.db.select().from(webhookSubscriptions).where(eq(webhookSubscriptions.tenantId, tenantId));
  }

  async findOne(id: string, tenantId: string) {
    const [record] = await this.db
      .select()
      .from(webhookSubscriptions)
      .where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.tenantId, tenantId)));
    return record;
  }

  async create(data: Omit<WebhookSubscription, 'id' | 'createdAt' | 'updatedAt'>, tenantId: string) {
    const [record] = await this.db
      .insert(webhookSubscriptions)
      .values({ ...data, tenantId })
      .returning();
    return record;
  }

  async update(id: string, data: Partial<WebhookSubscription>, tenantId: string) {
    const [record] = await this.db
      .update(webhookSubscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.tenantId, tenantId)))
      .returning();
    return record;
  }

  async delete(id: string, tenantId: string) {
    await this.db
      .delete(webhookSubscriptions)
      .where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.tenantId, tenantId)));
    return { success: true };
  }

  async getDeliveryLogs(webhookId: string, tenantId: string) {
    return this.db
      .select()
      .from(webhookDeliveryLogs)
      .where(eq(webhookDeliveryLogs.webhookId, webhookId));
  }
}
