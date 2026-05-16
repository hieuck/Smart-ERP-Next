import { pgTable, uuid, text, numeric, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const currencies = pgTable(
  'currencies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull().unique(), // e.g., USD, EUR, VND
    name: text('name').notNull(),
    symbol: text('symbol').notNull(),
    decimalPlaces: numeric('decimal_places').notNull().default('2'),
    isBaseCurrency: boolean('is_base_currency').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    idx1: index('currencies_tenant_idx').on(table.tenantId),
    idx2: index('currencies_code_idx').on(table.code),
  })
);

export type Currency = typeof currencies.$inferSelect;
export type NewCurrency = typeof currencies.$inferInsert;
