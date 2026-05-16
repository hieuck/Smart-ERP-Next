import { pgTable, uuid, text, timestamp, decimal, integer, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { customers } from './customers';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    name: text('name').notNull(),
    description: text('description'),
    
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'set null' }),
      
    status: text('status', { enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'] })
      .notNull()
      .default('planning'),
      
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    
    budget: decimal('budget', { precision: 20, scale: 2 }).default('0'),
    currency: text('currency').default('VND'),
    
    managerId: uuid('manager_id').references(() => users.id),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('projects_tenant_idx').on(t.tenantId),
    customerIdx: index('projects_customer_idx').on(t.customerId),
    managerIdx: index('projects_manager_idx').on(t.managerId),
  })
);

export const projectTasks = pgTable(
  'project_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
      
    title: text('title').notNull(),
    description: text('description'),
    
    status: text('status', { enum: ['todo', 'in_progress', 'review', 'done', 'blocked'] })
      .notNull()
      .default('todo'),
      
    priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).default('medium'),
    
    assignedToId: uuid('assigned_to_id').references(() => users.id),
    
    dueDate: timestamp('due_date'),
    estimatedHours: decimal('estimated_hours', { precision: 10, scale: 2 }),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index('project_tasks_project_idx').on(t.projectId),
    assigneeIdx: index('project_tasks_assignee_idx').on(t.assignedToId),
  })
);

export const projectTimesheets = pgTable(
  'project_timesheets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => projectTasks.id, { onDelete: 'set null' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
      
    date: timestamp('date').notNull(),
    hours: decimal('hours', { precision: 10, scale: 2 }).notNull(),
    
    description: text('description'),
    isBillable: integer('is_billable').default(1), // 1 for true, 0 for false
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index('timesheets_project_idx').on(t.projectId),
    userIdx: index('timesheets_user_idx').on(t.userId),
    dateIdx: index('timesheets_date_idx').on(t.date),
  })
);

export type Project = typeof projects.$inferSelect;
export type ProjectTask = typeof projectTasks.$inferSelect;
export type ProjectTimesheet = typeof projectTimesheets.$inferSelect;
