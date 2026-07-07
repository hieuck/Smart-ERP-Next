import { Injectable } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { outboxEvents } from '@smart-erp/database/schema';
import { eq, and, lte } from '@smart-erp/database/drizzle';

@Injectable()
export class OutboxService {
  async emit(eventType: string, payload: Record<string, any>, tenantId: string): Promise<string> {
    const [event] = await db.insert(outboxEvents).values({
      eventType,
      payload,
      tenantId,
      status: 'pending',
    }).returning();
    return event.id;
  }

  async processPending(
    handler: (event: { id: string; eventType: string; payload: any; tenantId: string }) => Promise<void>,
    batchSize = 10,
  ): Promise<number> {
    const events = await db.select().from(outboxEvents)
      .where(eq(outboxEvents.status, 'pending'))
      .limit(batchSize) as any[];

    for (const event of events) {
      try {
        await handler({ id: event.id, eventType: event.eventType, payload: event.payload, tenantId: event.tenantId });
        await db.update(outboxEvents).set({ status: 'completed' }).where(eq(outboxEvents.id, event.id));
      } catch {
        await db.update(outboxEvents).set({ status: 'failed' }).where(eq(outboxEvents.id, event.id));
      }
    }

    return events.length;
  }

  async cleanup(daysOld: number) {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    await db.delete(outboxEvents)
      .where(and(eq(outboxEvents.status, 'completed'), lte(outboxEvents.createdAt, cutoff)));
  }
}
