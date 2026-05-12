import { pgTable, text, decimal, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from '@smart-erp/database/schema';

export const currencies = pgTable('currencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  currencyCode: text('currency_code').notNull(), // VND, USD, EUR
  currencyName: text('currency_name').notNull(),
  symbol: text('symbol'),
  exchangeRate: decimal('exchange_rate', { precision: 18, scale: 6 }).notNull().default('1'),
  isBase: boolean('is_base').default(false),
  isActive: boolean('is_active').default(true),
  effectiveFrom: timestamp('effective_from').notNull(),
  effectiveTo: timestamp('effective_to'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Currency = typeof currencies.$inferSelect;
export type NewCurrency = typeof currencies.$inferInsert;