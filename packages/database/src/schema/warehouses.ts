import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const warehouses = pgTable(
  'warehouses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    address: text('address'),
    managerId: uuid('manager_id'),
    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('warehouses_tenant_idx').on(table.tenantId),
    codeIdx: index('warehouses_code_idx').on(table.code),
    // Composite index for tenant+name (common in warehouse listing searches)
    tenantNameIdx: index('warehouses_tenant_name_idx').on(table.tenantId, table.name),
  })
);

export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
