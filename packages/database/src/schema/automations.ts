import { pgTable, uuid, text, timestamp, index, boolean, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const automations = pgTable(
  'automations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    
    name: text('name').notNull(),
    description: text('description'),
    
    isActive: boolean('is_active').default(true),
    
    // Trigger event (e.g. 'invoice.created', 'employee.late')
    triggerEvent: text('trigger_event').notNull(),
    
    // JSON logic cho điều kiện (e.g. { "amount": { ">": 5000000 } })
    conditions: jsonb('conditions').default('{}'),
    
    // JSON logic cho hành động (e.g. [{ "type": "send_email", "to": "manager@abc.com" }])
    actions: jsonb('actions').notNull().default('[]'),
    
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('automations_tenant_idx').on(t.tenantId),
    triggerIdx: index('automations_trigger_idx').on(t.triggerEvent),
  })
);

export type Automation = typeof automations.$inferSelect;
export type NewAutomation = typeof automations.$inferInsert;
