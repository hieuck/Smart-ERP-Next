import { pgTable, uuid, text, timestamp, boolean, numeric, integer, index, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { customers } from './customers';
import { users } from './users';
import { warehouses } from './warehouses';
import { currencies } from './currencies';

// Đơn bán hàng
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    warehouseId: uuid('warehouse_id').references(() => warehouses.id, { onDelete: 'set null' }),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    currencyId: uuid('currency_id').references(() => currencies.id),
    // Trạng thái: draft, confirmed, processing, shipped, delivered, cancelled, returned
    status: text('status').notNull().default('draft'),
    // Kênh bán: pos, online, phone, wholesale
    channel: text('channel').notNull().default('pos'),
    subtotal: numeric('subtotal', { precision: 18, scale: 2 }).notNull().default('0'),
    discountAmount: numeric('discount_amount', { precision: 18, scale: 2 }).default('0'),
    discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }).default('0'),
    taxAmount: numeric('tax_amount', { precision: 18, scale: 2 }).default('0'),
    shippingFee: numeric('shipping_fee', { precision: 18, scale: 2 }).default('0'),
    total: numeric('total', { precision: 18, scale: 2 }).notNull().default('0'),
    paidAmount: numeric('paid_amount', { precision: 18, scale: 2 }).default('0'),
    debtAmount: numeric('debt_amount', { precision: 18, scale: 2 }).default('0'),
    // Thanh toán: unpaid, partial, paid
    paymentStatus: text('payment_status').notNull().default('unpaid'),
    paymentMethod: text('payment_method'), // cash, bank_transfer, card, momo, vnpay, zalopay
    shippingAddress: text('shipping_address'),
    shippingProvider: text('shipping_provider'),
    trackingCode: text('tracking_code'),
    notes: text('notes'),
    tags: text('tags'), // JSON array as text
    externalId: text('external_id'),
    externalPlatform: text('external_platform'),
    cancelReason: text('cancel_reason'),
    confirmedAt: timestamp('confirmed_at'),
    shippedAt: timestamp('shipped_at'),
    deliveredAt: timestamp('delivered_at'),
    cancelledAt: timestamp('cancelled_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('orders_tenant_idx').on(table.tenantId),
    tenantCodeUnique: unique('orders_tenant_code_unique').on(table.tenantId, table.code),
    customerIdx: index('orders_customer_idx').on(table.customerId),
    statusIdx: index('orders_status_idx').on(table.status),
    createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
    // Composite index for tenant+created_at (common in dashboard and reports)
    tenantCreatedAtIdx: index('orders_tenant_created_at_idx').on(table.tenantId, table.createdAt),
    // Composite index for tenant+status (common in order list queries)
    tenantStatusIdx: index('orders_tenant_status_idx').on(table.tenantId, table.status),
  })
);

// Chi tiết đơn hàng
export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull(),
    productName: text('product_name').notNull(), // snapshot tên lúc bán
    productSku: text('product_sku').notNull(),   // snapshot SKU lúc bán
    unit: text('unit').default('piece'),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 18, scale: 2 }).notNull(),
    discountAmount: numeric('discount_amount', { precision: 18, scale: 2 }).default('0'),
    discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }).default('0'),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('0'),
    lineTotal: numeric('line_total', { precision: 18, scale: 2 }).notNull(),
    notes: text('notes'),
    serialNumbers: text('serial_numbers'), // JSON array
    batchNumber: text('batch_number'),
    expiryDate: timestamp('expiry_date'),
  },
  (table) => ({
    orderIdx: index('order_items_order_idx').on(table.orderId),
    productIdx: index('order_items_product_idx').on(table.productId),
    // Composite index for product_id+order_id (common in product sales analysis)
    productOrderIdx: index('order_items_product_order_idx').on(table.productId, table.orderId),
  })
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
