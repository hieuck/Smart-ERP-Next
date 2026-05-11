import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDatabase } from '../../database/database.decorator';
import { Database } from '../../database/database.module';
import { webhookSubscriptions, webhookDeliveryLogs } from '@smart-erp/database';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import { createHmac } from 'crypto';

@Injectable()
export class WebhookDispatcher implements OnModuleInit {
  constructor(
    @InjectDatabase() private db: Database,
    private eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // Subscribe to all relevant events
    const events = [
      'order.created', 'order.updated', 'order.cancelled',
      'stock.low', 'stock.adjusted',
      'sync.completed', 'sync.failed',
      'payment.received',
    ];
    for (const event of events) {
      this.eventEmitter.on(event, async (payload) => {
        await this.dispatch(event, payload);
      });
    }
  }

  private async dispatch(event: string, payload: any) {
    const webhooks = await this.db
      .select()
      .from(webhookSubscriptions)
      .where(eq(webhookSubscriptions.active, true));

    for (const webhook of webhooks) {
      if (!webhook.events.includes(event)) continue;

      const start = Date.now();
      let statusCode: number | null = null;
      let responseBody = '';
      let error = '';

      try {
        const signature = webhook.secret
          ? createHmac('sha256', webhook.secret).update(JSON.stringify(payload)).digest('hex')
          : null;

        const res = await axios.post(webhook.url, payload, {
          headers: signature ? { 'x-webhook-signature': signature } : {},
          timeout: 5000,
        });
        statusCode = res.status;
        responseBody = JSON.stringify(res.data).slice(0, 1000);
      } catch (err: any) {
        statusCode = err.response?.status || 0;
        responseBody = err.response?.data ? JSON.stringify(err.response.data).slice(0, 1000) : '';
        error = err.message;
      }

      await this.db.insert(webhookDeliveryLogs).values({
        webhookId: webhook.id,
        event,
        payload,
        statusCode: statusCode?.toString(),
        responseBody,
        error: error || null,
        attempt: 1,
      });
    }
  }
}
