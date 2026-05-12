import { pgTable, text, decimal, boolean, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from '@smart-erp/database/schema';

export const financialReports = pgTable('financial_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  type: text('type').notNull(), // balance_sheet, income_statement, cash_flow
  name: text('name').notNull(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  data: jsonb('data').notNull(),
  currency: text('currency').default('VND'),
  unit: text('unit').default('VND'),
  generatedAt: timestamp('generated_at').defaultNow(),
  generatedBy: uuid('generated_by'),
  isFinalized: boolean('is_finalized').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type FinancialReport = typeof financialReports.$inferSelect;
export type NewFinancialReport = typeof financialReports.$inferInsert;