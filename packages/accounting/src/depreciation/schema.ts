import { pgTable, text, decimal, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from '@smart-erp/database/schema';
import { chartOfAccounts } from '../chart-of-accounts/schema';

export const fixedAssets = pgTable('fixed_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  assetCode: text('asset_code').notNull(),
  assetName: text('asset_name').notNull(),
  assetType: text('asset_type').notNull(), // vehicle, equipment, building, land, other
  purchaseDate: timestamp('purchase_date').notNull(),
  purchaseCost: decimal('purchase_cost', { precision: 18, scale: 2 }).notNull(),
  usefulLifeMonths: integer('useful_life_months').notNull(),
  residualValue: decimal('residual_value', { precision: 18, scale: 2 }).default('0'),
  depreciationMethod: text('depreciation_method').default('straight_line'), // straight_line, declining
  accumulatedDepreciation: decimal('accumulated_depreciation', { precision: 18, scale: 2 }).default('0'),
  currentValue: decimal('current_value', { precision: 18, scale: 2 }),
  depreciationAccountId: uuid('depreciation_account_id').references(() => chartOfAccounts.id),
  accumulatedDepreciationAccountId: uuid('accumulated_dep_account_id').references(() => chartOfAccounts.id),
  isFullyDepreciated: boolean('is_fully_depreciated').default(false),
  disposalDate: timestamp('disposal_date'),
  disposalValue: decimal('disposal_value', { precision: 18, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type FixedAsset = typeof fixedAssets.$inferSelect;
export type NewFixedAsset = typeof fixedAssets.$inferInsert;