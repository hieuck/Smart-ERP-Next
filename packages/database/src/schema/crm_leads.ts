import { pgTable, uuid, text, timestamp, numeric, index, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { customers } from './customers';

export const crmLeads = pgTable(
  'crm_leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    company: text('company'),
    source: text('source').default('other'),
    status: text('status').notNull().default('new'),
    leadScore: numeric('lead_score', { precision: 5, scale: 2 }).default('0'),
    industry: text('industry'),
    description: text('description'),
    assignedToId: uuid('assigned_to_id').references(() => users.id, { onDelete: 'set null' }),
    convertedAt: timestamp('converted_at'),
    convertedAccountId: uuid('converted_account_id').references(() => customers.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    idx1: index('crm_leads_tenant_idx').on(table.tenantId),
    idx2: index('crm_leads_status_idx').on(table.status),
    idx3: index('crm_leads_email_idx').on(table.email),
  })
);
