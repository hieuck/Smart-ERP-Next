import { pgTable, uuid, text, integer, timestamp, boolean, numeric, date } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products } from './products';
import { warehouses } from './warehouses';

export const productLots = pgTable('product_lots', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  lotNumber: text('lot_number').notNull(),
  expiryDate: date('expiry_date'),
  quantity: integer('quantity').notNull().default(0),
  remainingQuantity: integer('remaining_quantity').notNull().default(0),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id, { onDelete: 'set null' }),
  receivedDate: date('received_date').defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('product_lots_tenant_idx').on(table.tenantId),
  productIdx: index('product_lots_product_idx').on(table.productId),
  lotNumberIdx: index('product_lots_lot_number_idx').on(table.lotNumber),
  expiryIdx: index('product_lots_expiry_idx').on(table.expiryDate),
  warehouseIdx: index('product_lots_warehouse_idx').on(table.warehouseId),
}));

export type ProductLot = typeof productLots.$inferSelect;
export type NewProductLot = typeof productLots.$inferInsert;
