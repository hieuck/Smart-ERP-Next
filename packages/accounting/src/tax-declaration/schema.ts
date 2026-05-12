import { pgTable, text, decimal, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from '@smart-erp/database/schema';

export const taxDeclarations = pgTable('tax_declarations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  type: text('type').notNull(), // income_tax, vat, special_consumption
  period: text('period').notNull(),
  status: text('status').default('draft'),
  totalAmount: decimal('total_amount', { precision: 18, scale: 2 }).default('0'),
  declaredAt: timestamp('declared_at'),
  declaredBy: uuid('declared_by'),
  approvedAt: timestamp('approved_at'),
  approvedBy: uuid('approved_by'),
  paymentDueDate: timestamp('payment_due_date'),
  isPaid: boolean('is_paid').default(false),
  paidAt: timestamp('paid_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type TaxDeclaration = typeof taxDeclarations.$inferSelect;
export type NewTaxDeclaration = typeof taxDeclarations.$inferInsert;