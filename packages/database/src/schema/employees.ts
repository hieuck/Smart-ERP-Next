import { pgTable, uuid, text, timestamp, boolean, numeric, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const employees = pgTable(
  'employees',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    position: text('position'),
    salary: numeric('salary', { precision: 15, scale: 2 }).notNull().default('0'),
    hireDate: timestamp('hire_date').defaultNow(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('employees_tenant_idx').on(t.tenantId),
    codeIdx: index('employees_code_idx').on(t.code),
    emailIdx: index('employees_email_idx').on(t.email),
  })
);

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
