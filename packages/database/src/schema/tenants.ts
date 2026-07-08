import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  defaultCurrency: text('default_currency').notNull().default('VND'),
  address: text('address'),
  taxCode: text('tax_code'),
  phone: text('phone'),
  industry: text('industry'),
  onboardingStatus: text('onboarding_status').notNull().default('pending'),
  settings: jsonb('settings').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
