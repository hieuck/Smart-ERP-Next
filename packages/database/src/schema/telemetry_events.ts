import { pgTable, text, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const telemetryEvents = pgTable('telemetry_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  event: text('event').notNull(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
