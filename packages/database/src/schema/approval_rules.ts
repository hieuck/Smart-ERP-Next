import { pgTable, uuid, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const approvalRules = pgTable(
  'approval_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    documentType: text('document_type').notNull(), // purchase_order, sales_order, invoice, payment
    minAmount: numeric('min_amount', { precision: 18, scale: 2 }),
    maxAmount: numeric('max_amount', { precision: 18, scale: 2 }),
    priority: numeric('priority').notNull().default('1'), // lower number = higher priority
    isActive: text('is_active').notNull().default('true'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('approval_rules_tenant_idx').on(table.tenantId),
    index('approval_rules_doc_type_idx').on(table.documentType),
  ]
);

export type ApprovalRule = typeof approvalRules.$inferSelect;
export type NewApprovalRule = typeof approvalRules.$inferInsert;
