import { pgTable, uuid, text, timestamp, decimal, integer, index, boolean, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { fixedAssets } from './fixed_assets';
import { users } from './users';

export const maintenanceOrders = pgTable(
  'maintenance_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    assetId: uuid('asset_id')
      .notNull()
      .references(() => fixedAssets.id, { onDelete: 'cascade' }),
      
    orderNumber: text('order_number').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    
    // Type: corrective (su co), preventive (dinh ky)
    type: text('type', { enum: ['corrective', 'preventive'] }).default('corrective'),
    
    // Status: draft, pending, in_progress, completed, cancelled
    status: text('status', { enum: ['draft', 'pending', 'in_progress', 'completed', 'cancelled'] }).default('pending'),
    
    priority: text('priority', { enum: ['low', 'medium', 'high', 'critical'] }).default('medium'),
    
    assignedTechnicianId: uuid('assigned_technician_id').references(() => users.id),
    
    startTime: timestamp('start_time'),
    endTime: timestamp('end_time'),
    
    actualCost: decimal('actual_cost', { precision: 20, scale: 2 }).default('0'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('maint_order_tenant_idx').on(t.tenantId),
    assetIdx: index('maint_order_asset_idx').on(t.assetId),
    statusIdx: index('maint_order_status_idx').on(t.status),
    orderNumberUnique: unique('maintenance_orders_tenant_order_number_unique').on(t.tenantId, t.orderNumber),
  })
);

export const maintenanceSchedules = pgTable(
  'maintenance_schedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    assetId: uuid('asset_id')
      .notNull()
      .references(() => fixedAssets.id, { onDelete: 'cascade' }),
      
    name: text('name').notNull(),
    
    // Interval: every X days/weeks/months
    frequencyInterval: integer('frequency_interval').notNull(),
    frequencyUnit: text('frequency_unit', { enum: ['days', 'weeks', 'months'] }).notNull(),
    
    lastMaintenanceDate: timestamp('last_maintenance_date'),
    nextMaintenanceDate: timestamp('next_maintenance_date').notNull(),
    
    isActive: boolean('is_active').default(true),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('maint_sched_tenant_idx').on(t.tenantId),
    assetIdx: index('maint_sched_asset_idx').on(t.assetId),
    nextDateIdx: index('maint_sched_next_date_idx').on(t.nextMaintenanceDate),
  })
);

export type MaintenanceOrder = typeof maintenanceOrders.$inferSelect;
export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;
