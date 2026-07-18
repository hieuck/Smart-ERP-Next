import { pgTable, uuid, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { customers } from './customers';

export const loyaltyCards = pgTable(
  'loyalty_cards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    points: integer('points').notNull().default(0),
    tier: text('tier').notNull().default('bronze'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('loyalty_cards_tenant_idx').on(table.tenantId),
    customerIdx: index('loyalty_cards_customer_idx').on(table.customerId),
  })
);

export const loyaltyRewards = pgTable(
  'loyalty_rewards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    pointsRequired: integer('points_required').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('loyalty_rewards_tenant_idx').on(table.tenantId),
  })
);

export const loyaltyTransactions = pgTable(
  'loyalty_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    loyaltyCardId: uuid('loyalty_card_id')
      .notNull()
      .references(() => loyaltyCards.id, { onDelete: 'cascade' }),
    points: integer('points').notNull(),
    type: text('type', { enum: ['earn', 'redeem'] }).notNull(),
    referenceId: text('reference_id'),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    cardIdx: index('loyalty_tx_card_idx').on(table.loyaltyCardId),
  })
);
