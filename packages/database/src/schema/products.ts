import { pgTable, uuid, text, numeric, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sku: text('sku').notNull().unique(),
    externalId: text('external_id'),
    externalPlatform: text('external_platform'),
    description: text('description'),
    category: text('category'), // simple category, can be extended later
    unit: text('unit').default('piece'), // piece, kg, box, etc.
    price: numeric('price', { precision: 18, scale: 2 }).notNull(),
    cost: numeric('cost', { precision: 18, scale: 2 }).default('0'),
    stock: integer('stock').notNull().default(0),
    minStock: integer('min_stock').default(0),
    reorderQuantity: integer('reorder_quantity').default(0),
    leadTimeDays: integer('lead_time_days').default(7),
    safetyStock: integer('safety_stock').default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('products_tenant_idx').on(table.tenantId),
    skuIdx: index('products_sku_idx').on(table.sku),
    categoryIdx: index('products_category_idx').on(table.category),
    activeIdx: index('products_active_idx').on(table.isActive),
  })
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
