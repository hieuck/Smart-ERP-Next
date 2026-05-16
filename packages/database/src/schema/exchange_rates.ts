import { pgTable, uuid, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { currencies } from './currencies';

export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fromCurrencyId: uuid('from_currency_id').notNull().references(() => currencies.id, { onDelete: 'cascade' }),
    toCurrencyId: uuid('to_currency_id').notNull().references(() => currencies.id, { onDelete: 'cascade' }),
    rate: numeric('rate').notNull(),
    effectiveDate: timestamp('effective_date').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    fromToIdx: index('exchange_rates_from_to_idx').on(table.fromCurrencyId, table.toCurrencyId),
    effectiveIdx: index('exchange_rates_effective_idx').on(table.effectiveDate),
  })
);

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;
