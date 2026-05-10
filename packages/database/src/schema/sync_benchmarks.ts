import { pgTable, uuid, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const syncBenchmarks = pgTable(
  'sync_benchmarks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    clientId: text('client_id').notNull(),
    endpoint: text('endpoint').notNull(), // push | pull
    status: text('status').notNull(),      // success | failure | conflict
    durationMs: integer('duration_ms').notNull(),
    changesCount: integer('changes_count').default(0),
    sizeBytes: integer('size_bytes').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantCreatedIdx: index('sync_benchmarks_tenant_created_idx').on(table.tenantId, table.createdAt),
  })
);

export type SyncBenchmark = typeof syncBenchmarks.$inferSelect;
export type NewSyncBenchmark = typeof syncBenchmarks.$inferInsert;
