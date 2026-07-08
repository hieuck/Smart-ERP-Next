import { pgTable, uuid, text, timestamp, boolean, jsonb, index, integer, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products } from './products';

// E-commerce store integrations (Shopee, Lazada, TikTok Shop, Amazon, eBay, etc.)
export const ecommerceStores = pgTable(
  'ecommerce_stores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    // Platform: shopee, lazada, tiktokshop, amazon, ebay, woocommerce, shopify
    platform: text('platform').notNull(),
    name: text('name').notNull(), // e.g., "Shopee Store 1", "Lazada Official"
    // Encrypted credentials stored as JSON
    configJson: text('config_json').notNull(), // { apiKey, apiSecret, shopId, etc. }
    isActive: boolean('is_active').notNull().default(true),
    lastSyncAt: timestamp('last_sync_at'),
    lastSyncStatus: text('last_sync_status'), // success, failed, pending
    syncErrorMessage: text('sync_error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('ecommerce_stores_tenant_idx').on(table.tenantId),
    platformIdx: index('ecommerce_stores_platform_idx').on(table.platform),
    tenantPlatformIdx: index('ecommerce_stores_tenant_platform_idx').on(table.tenantId, table.platform),
  })
);

// E-commerce sync logs for audit trail
export const ecommerceSyncLogs = pgTable(
  'ecommerce_sync_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => ecommerceStores.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    // Sync type: products, orders, inventory, all
    syncType: text('sync_type').notNull(),
    status: text('status').notNull(), // success, failed, partial
    itemsProcessed: text('items_processed').default('0'), // JSON: { products: 10, orders: 5 }
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at').notNull(),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    storeIdx: index('ecommerce_sync_logs_store_idx').on(table.storeId),
    tenantIdx: index('ecommerce_sync_logs_tenant_idx').on(table.tenantId),
    syncTypeIdx: index('ecommerce_sync_logs_sync_type_idx').on(table.syncType),
  })
);

// Multi-channel inventory tracking (which warehouse/stock level per platform)
export const ecommerceChannelInventory = pgTable(
  'ecommerce_channel_inventory',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    storeId: uuid('store_id')
      .notNull()
      .references(() => ecommerceStores.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    externalProductId: text('external_product_id').notNull(), // Platform's product ID
    platformStock: integer('platform_stock').notNull().default(0), // Current stock on platform
    localStock: integer('local_stock').notNull().default(0), // Current stock in local warehouse
    lastSyncedAt: timestamp('last_synced_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('ecommerce_channel_inventory_tenant_idx').on(table.tenantId),
    storeIdx: index('ecommerce_channel_inventory_store_idx').on(table.storeId),
    productIdx: index('ecommerce_channel_inventory_product_idx').on(table.productId),
    externalProductIdx: index('ecommerce_channel_inventory_external_product_idx').on(table.externalProductId),
    tenantStoreProductExternalUnique: unique('ecom_inv_tenant_store_product_ext_unique').on(
      table.tenantId,
      table.storeId,
      table.productId,
      table.externalProductId,
    ),
  })
);

export type EcommerceStore = typeof ecommerceStores.$inferSelect;
export type NewEcommerceStore = typeof ecommerceStores.$inferInsert;
export type EcommerceSyncLog = typeof ecommerceSyncLogs.$inferSelect;
export type NewEcommerceSyncLog = typeof ecommerceSyncLogs.$inferInsert;
export type EcommerceChannelInventory = typeof ecommerceChannelInventory.$inferSelect;
export type NewEcommerceChannelInventory = typeof ecommerceChannelInventory.$inferInsert;
