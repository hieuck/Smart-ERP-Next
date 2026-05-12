import { pgTable, text, decimal, boolean, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { tenants } from '@smart-erp/database/schema';

export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  accountCode: text('account_code').notNull(),
  accountName: text('account_name').notNull(),
  accountNameEn: text('account_name_en'),
  accountType: text('account_type').notNull(), // asset, liability, equity, revenue, expense
  parentId: uuid('parent_id'),
  isActive: boolean('is_active').default(true),
  description: text('description'),
  balance: decimal('balance', { precision: 18, scale: 2 }).default('0'),
  currency: text('currency').default('VND'),
  isSystem: boolean('is_system').default(false),
  allowDelete: boolean('allow_delete').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type NewChartOfAccount = typeof chartOfAccounts.$inferInsert;