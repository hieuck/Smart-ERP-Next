import { pgTable, uuid, text, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { reportTemplates } from './report_templates';

export const scheduledReports = pgTable(
  'scheduled_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id').notNull().references(() => reportTemplates.id, { onDelete: 'cascade' }),
    cronExpression: text('cron_expression').notNull(),
    parameters: jsonb('parameters'), // default parameters for each run
    recipientEmails: text('recipient_emails'), // comma-separated
    isActive: boolean('is_active').default(true),
    lastRunAt: timestamp('last_run_at'),
    nextRunAt: timestamp('next_run_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    idx1: index('scheduled_reports_tenant_idx').on(table.tenantId),
    idx2: index('scheduled_reports_template_idx').on(table.templateId),
  })
);

export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type NewScheduledReport = typeof scheduledReports.$inferInsert;
