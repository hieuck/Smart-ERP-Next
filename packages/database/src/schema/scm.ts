import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, decimal, integer, index, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products } from './products';
import { suppliers } from './suppliers';

export const supplierLeadTimes = pgTable(
  'supplier_lead_times',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
      
    avgLeadTimeDays: integer('avg_lead_time_days').notNull().default(7),
    lastLeadTimeDays: integer('last_lead_time_days'),
    
    reliabilityScore: decimal('reliability_score', { precision: 3, scale: 2 }).default('1.0'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('scm_lt_tenant_idx').on(t.tenantId),
    productIdx: index('scm_lt_product_idx').on(t.productId),
    supplierIdx: index('scm_lt_supplier_idx').on(t.supplierId),
  })
);

export const inventoryReorderSuggestions = pgTable(
  'inventory_reorder_suggestions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
      
    suggestedQuantity: decimal('suggested_quantity', { precision: 20, scale: 2 }).notNull(),
    currentStock: decimal('current_stock', { precision: 20, scale: 2 }).notNull(),
    
    reason: text('reason'), // e.g., "Predicted stockout in 5 days", "Seasonality"
    priority: text('priority', { enum: ['low', 'medium', 'high', 'critical'] }).default('medium'),
    
    status: text('status', { enum: ['pending', 'approved', 'dismissed', 'ordered'] }).default('pending'),
    
    aiModelUsed: text('ai_model_used'),
    confidence: decimal('confidence', { precision: 3, scale: 2 }),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('scm_reorder_tenant_idx').on(t.tenantId),
    productIdx: index('scm_reorder_product_idx').on(t.productId),
    statusIdx: index('scm_reorder_status_idx').on(t.status),
    activeUnique: uniqueIndex('scm_reorder_active_unique')
      .on(t.tenantId, t.productId)
      .where(sql`${t.status} IN ('pending', 'approved')`),
  })
);

export type SupplierLeadTime = typeof supplierLeadTimes.$inferSelect;
export type InventoryReorderSuggestion = typeof inventoryReorderSuggestions.$inferSelect;
