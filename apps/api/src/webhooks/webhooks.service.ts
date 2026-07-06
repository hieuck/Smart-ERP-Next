import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { webhookSubscriptions, webhookDeliveryLogs, NewWebhookSubscription, NewWebhookDeliveryLog } from '@smart-erp/database';
import { eq, and, desc } from 'drizzle-orm';
import * as net from 'node:net';

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
    this.assertSafeWebhookUrl(url);
    const sub: NewWebhookSubscription = {
      tenantId,
      name: `Webhook ${new Date().toISOString().slice(0, 10)}`,
      url,
      events,
      secret,
      active: true,
    };
    const [result] = await this.drizzle.db.insert(webhookSubscriptions).values(sub).returning();
    return result;
  }

  /** List subscriptions for tenant */
  async listSubscriptions(tenantId: string) {
    return this.drizzle.db
      .select()
      .from(webhookSubscriptions)
      .where(and(eq(webhookSubscriptions.tenantId, tenantId), eq(webhookSubscriptions.active, true)));
  }

  /** Delete a subscription */
  async unsubscribe(tenantId: string, subscriptionId: string) {
    await this.drizzle.db
      .update(webhookSubscriptions)
      .set({ active: false })
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
        eq(webhookSubscriptions.active, true),
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
    const TIMEOUT_MS = 10_000; // 10 seconds per attempt

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const start = Date.now();
      try {
        const response = await fetch(sub.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': sub.secret ? this.sign(payload, sub.secret) : '',
            'X-Webhook-Event': payload.event,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        await this.logDelivery(sub.id, payload, response.ok ? 'success' : 'failed', response.status, Date.now() - start);
        return;
      } catch (error: any) {
        const isTimeout = error?.name === 'AbortError' || error?.message?.toLowerCase().includes('timeout');
        const errorMessage = isTimeout ? 'Webhook delivery timed out' : error.message;

        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
        } else {
          await this.logDelivery(sub.id, payload, 'failed', isTimeout ? 504 : 0, Date.now() - start, errorMessage);
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
    const log: NewWebhookDeliveryLog = {
      webhookId: subscriptionId,
      event: payload.event,
      payload: payload as any,
      statusCode: statusCode.toString(),
      error,
    };
    await this.drizzle.db.insert(webhookDeliveryLogs).values(log);
  }

  /** Validate a webhook URL to prevent SSRF against internal addresses */
  private assertSafeWebhookUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('Invalid webhook URL');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Webhook URL must use HTTP or HTTPS');
    }

    const host = parsed.hostname.toLowerCase();

    if (host === 'localhost' || host.endsWith('.localhost')) {
      throw new Error('Webhook URL points to a forbidden local address');
    }

    if (net.isIPv4(host)) {
      if (this.isForbiddenIPv4(host)) {
        throw new Error('Webhook URL points to a forbidden local address');
      }
      return;
    }

    if (net.isIPv6(host)) {
      if (this.isForbiddenIPv6(host)) {
        throw new Error('Webhook URL points to a forbidden local address');
      }
    }
  }

  private isForbiddenIPv4(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
      return true;
    }
    const [a, b] = parts;

    return (
      a === 127 || // 127.0.0.0/8
      (a === 10) || // 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) || // 192.168.0.0/16
      (a === 169 && b === 254) // 169.254.0.0/16
    );
  }

  private isForbiddenIPv6(ip: string): boolean {
    if (ip === '::1') return true;

    const withoutZone = ip.split('%')[0];
    const firstGroup = withoutZone.split(':')[0];
    if (!firstGroup) return false;

    const value = parseInt(firstGroup, 16);
    return !Number.isNaN(value) && value >= 0xfe80 && value <= 0xfebf;
  }

  /** Get delivery logs for a subscription */
  async getDeliveryLogs(tenantId: string, subscriptionId: string, limit = 50) {
    return this.drizzle.db
      .select()
      .from(webhookDeliveryLogs)
      .where(eq(webhookDeliveryLogs.webhookId, subscriptionId))
      .orderBy(desc(webhookDeliveryLogs.createdAt))
      .limit(limit);
  }
}