import { pgTable, text, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const outboxEvents = pgTable('outbox_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
});
