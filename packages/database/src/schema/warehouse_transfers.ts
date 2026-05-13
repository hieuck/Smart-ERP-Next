import { pgTable, uuid, text, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { warehouses } from './warehouses';
import { products } from './products';

export const warehouseTransfers = pgTable('warehouse_transfers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  transferCode: text('transfer_code').notNull(),
  fromWarehouseId: uuid('from_warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  toWarehouseId: uuid('to_warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('draft'),
  notes: text('notes'),
  requestedBy: uuid('requested_by'),
  approvedBy: uuid('approved_by'),
  shippedAt: timestamp('shipped_at'),
  receivedAt: timestamp('received_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('warehouse_transfers_tenant_idx').on(table.tenantId),
  fromWarehouseIdx: index('warehouse_transfers_from_idx').on(table.fromWarehouseId),
  toWarehouseIdx: index('warehouse_transfers_to_idx').on(table.toWarehouseId),
  statusIdx: index('warehouse_transfers_status_idx').on(table.status),
  transferCodeIdx: index('warehouse_transfers_code_idx').on(table.transferCode),
}));

export type WarehouseTransfer = typeof warehouseTransfers.$inferSelect;
export type NewWarehouseTransfer = typeof warehouseTransfers.$inferInsert;

export const warehouseTransferItems = pgTable('warehouse_transfer_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  transferId: uuid('transfer_id')
    .notNull()
    .references(() => warehouseTransfers.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  lotId: uuid('lot_id'),
  quantityRequested: integer('quantity_requested').notNull(),
  quantityShipped: integer('quantity_shipped').default(0),
  quantityReceived: integer('quantity_received').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  transferIdx: index('warehouse_transfer_items_transfer_idx').on(table.transferId),
  productIdx: index('warehouse_transfer_items_product_idx').on(table.productId),
}));

export type WarehouseTransferItem = typeof warehouseTransferItems.$inferSelect;
export type NewWarehouseTransferItem = typeof warehouseTransferItems.$inferInsert;
