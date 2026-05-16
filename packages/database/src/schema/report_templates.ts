import { pgTable, uuid, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const reportTemplates = pgTable(
  'report_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    querySql: text('query_sql').notNull(), // parameterized SQL (uses :startDate, :endDate, :tenantId)
    parameters: jsonb('parameters'), // e.g., { startDate: { type: 'date', required: true }, ... }
    outputSchema: jsonb('output_schema'), // column names, types
    isSystem: boolean('is_system').default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    idx1: index('report_templates_tenant_idx').on(table.tenantId),
  })
);

export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type NewReportTemplate = typeof reportTemplates.$inferInsert;
