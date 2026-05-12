import { pgTable, text, boolean, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from '@smart-erp/database/schema';

export const voucherTypes = pgTable('voucher_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  code: text('code').notNull(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  category: text('category').notNull(), // payment, receipt, journal, invoice
  description: text('description'),
  isActive: boolean('is_active').default(true),
  autoNumber: boolean('auto_number').default(true),
  prefix: text('prefix'),
  numberSequence: text('number_sequence').default('000001'),
  requiredFields: jsonb('required_fields').$type<string[]>(),
  optionalFields: jsonb('optional_fields').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type VoucherType = typeof voucherTypes.$inferSelect;
export type NewVoucherType = typeof voucherTypes.$inferInsert;