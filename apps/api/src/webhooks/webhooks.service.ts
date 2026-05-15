import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { webhookSubscriptions, webhookDeliveries, NewWebhookSubscription, NewWebhookDelivery } from '@smart-erp/database';
import { eq, and, desc } from 'drizzle-orm';

export type WebhookEvent =
  | 'order.created'
  | 'order.status_changed'
  | 'payment.received'
  | 'inventory.low_stock'
  | 'approval.new'
  | 'approval.decision'
  | 'customer.created'
  | 'sync.completed';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  tenantId: string;
  data: Record<string, unknown>;
}

@Injectable()
export class WebhooksService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /** Create a webhook subscription */
  async subscribe(tenantId: string, url: string, events: WebhookEvent[], secret?: string) {
    const sub: NewWebhookSubscription = {
      tenantId,
      url,
      events,
      secret,
      isActive: true,
    };
    const [result] = await this.drizzle.db.insert(webhookSubscriptions).values(sub).returning();
    return result;
  }

  /** List subscriptions for tenant */
  async listSubscriptions(tenantId: string) {
    return this.drizzle.db
      .select()
      .from(webhookSubscriptions)
      .where(and(eq(webhookSubscriptions.tenantId, tenantId), eq(webhookSubscriptions.isActive, true)));
  }

  /** Delete a subscription */
  async unsubscribe(tenantId: string, subscriptionId: string) {
    await this.drizzle.db
      .update(webhookSubscriptions)
      .set({ isActive: false })
      .where(and(eq(webhookSubscriptions.id, subscriptionId), eq(webhookSubscriptions.tenantId, tenantId)));
  }

  /** Dispatch webhook to all matching subscriptions */
  async dispatch(event: WebhookEvent, tenantId: string, data: Record<string, unknown>) {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      tenantId,
      data,
    };

    const subscriptions = await this.drizzle.db
      .select()
      .from(webhookSubscriptions)
      .where(and(
        eq(webhookSubscriptions.tenantId, tenantId),
        eq(webhookSubscriptions.isActive, true),
      ));

    const matching = subscriptions.filter((s) => s.events.includes(event));

    await Promise.allSettled(
      matching.map((sub) => this.deliverWebhook(sub, payload)),
    );
  }

  /** Deliver a single webhook with retry logic */
  private async deliverWebhook(sub: any, payload: WebhookPayload) {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const start = Date.now();
        const response = await fetch(sub.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': sub.secret ? this.sign(payload, sub.secret) : '',
            'X-Webhook-Event': payload.event,
          },
          body: JSON.stringify(payload),
        });

        await this.logDelivery(sub.id, payload, response.ok ? 'success' : 'failed', response.status, Date.now() - start);
        return;
      } catch (error: any) {
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
        } else {
          await this.logDelivery(sub.id, payload, 'failed', 0, 0, error.message);
        }
      }
    }
  }

  private sign(payload: WebhookPayload, secret: string): string {
    // HMAC-SHA256 signature
    const crypto = require('crypto');
    const body = JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  private async logDelivery(
    subscriptionId: string,
    payload: WebhookPayload,
    status: 'success' | 'failed',
    statusCode: number,
    latencyMs: number,
    error?: string,
  ) {
    const log: NewWebhookDelivery = {
      subscriptionId,
      event: payload.event,
      payload: payload as any,
      status,
      statusCode,
      latencyMs,
      error,
    };
    await this.drizzle.db.insert(webhookDeliveries).values(log);
  }

  /** Get delivery logs for a subscription */
  async getDeliveryLogs(tenantId: string, subscriptionId: string, limit = 50) {
    return this.drizzle.db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.subscriptionId, subscriptionId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit);
  }
}