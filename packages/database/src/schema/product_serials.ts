import { pgTable, uuid, text, timestamp, boolean, date, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products } from './products';
import { productLots } from './product_lots';

export const productSerials = pgTable('product_serials', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  lotId: uuid('lot_id').references(() => productLots.id, { onDelete: 'set null' }),
  serialNumber: text('serial_number').notNull(),
  status: text('status').notNull().default('in_stock'),
  warrantyExpiry: date('warranty_expiry'),
  soldAt: timestamp('sold_at'),
  soldToCustomerId: uuid('sold_to_customer_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('product_serials_tenant_idx').on(table.tenantId),
  productIdx: index('product_serials_product_idx').on(table.productId),
  serialNumberIdx: index('product_serials_serial_idx').on(table.serialNumber),
  lotIdx: index('product_serials_lot_idx').on(table.lotId),
  statusIdx: index('product_serials_status_idx').on(table.status),
}));

export type ProductSerial = typeof productSerials.$inferSelect;
export type NewProductSerial = typeof productSerials.$inferInsert;
