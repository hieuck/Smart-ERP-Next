import { pgTable, text, decimal, boolean, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { tenants } from '@smart-erp/database/schema';

export const vatRates = pgTable('vat_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  code: text('code').notNull(),
  name: text('name').notNull(),
  rate: decimal('rate', { precision: 5, scale: 2 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),
  applicableFrom: timestamp('applicable_from'),
  applicableTo: timestamp('applicable_to'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const vatDeclarations = pgTable('vat_declarations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  period: text('period').notNull(), // YYYY-MM format
  declarationType: text('declaration_type').notNull(), // monthly, quarterly
  totalOutputVat: decimal('total_output_vat', { precision: 18, scale: 2 }).default('0'),
  totalInputVat: decimal('total_input_vat', { precision: 18, scale: 2 }).default('0'),
  totalVatPayable: decimal('total_vat_payable', { precision: 18, scale: 2 }).default('0'),
  status: text('status').default('draft'), // draft, submitted, approved
  submittedAt: timestamp('submitted_at'),
  submittedBy: uuid('submitted_by'),
  approvedAt: timestamp('approved_at'),
  approvedBy: uuid('approved_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type VatRate = typeof vatRates.$inferSelect;
export type NewVatRate = typeof vatRates.$inferInsert;
export type VatDeclaration = typeof vatDeclarations.$inferSelect;
export type NewVatDeclaration = typeof vatDeclarations.$inferInsert;