import { pgTable, uuid, text, timestamp, numeric, integer, index, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { suppliers } from './suppliers';
import { users } from './users';
import { warehouses } from './warehouses';

// Đơn nhập hàng
export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
    warehouseId: uuid('warehouse_id').references(() => warehouses.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    // draft, confirmed, partial_received, received, cancelled
    status: text('status').notNull().default('draft'),
    subtotal: numeric('subtotal', { precision: 18, scale: 2 }).notNull().default('0'),
    discountAmount: numeric('discount_amount', { precision: 18, scale: 2 }).default('0'),
    taxAmount: numeric('tax_amount', { precision: 18, scale: 2 }).default('0'),
    total: numeric('total', { precision: 18, scale: 2 }).notNull().default('0'),
    paidAmount: numeric('paid_amount', { precision: 18, scale: 2 }).default('0'),
    // unpaid, partial, paid
    paymentStatus: text('payment_status').notNull().default('unpaid'),
    paymentMethod: text('payment_method'),
    expectedDate: timestamp('expected_date'),
    receivedAt: timestamp('received_at'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('po_tenant_idx').on(table.tenantId),
    codeUnique: unique('po_tenant_code_unique').on(table.tenantId, table.code),
    supplierIdx: index('po_supplier_idx').on(table.supplierId),
    statusIdx: index('po_status_idx').on(table.status),
  })
);

export const purchaseOrderItems = pgTable(
  'purchase_order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    purchaseOrderId: uuid('purchase_order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull(),
    productName: text('product_name').notNull(),
    productSku: text('product_sku').notNull(),
    unit: text('unit').default('piece'),
    orderedQty: integer('ordered_qty').notNull(),
    receivedQty: integer('received_qty').notNull().default(0),
    unitCost: numeric('unit_cost', { precision: 18, scale: 2 }).notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('0'),
    lineTotal: numeric('line_total', { precision: 18, scale: 2 }).notNull(),
    batchNumber: text('batch_number'),
    expiryDate: timestamp('expiry_date'),
    notes: text('notes'),
  },
  (table) => ({
    poIdx: index('po_items_po_idx').on(table.purchaseOrderId),
    productIdx: index('po_items_product_idx').on(table.productId),
  })
);

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
