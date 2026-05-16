import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // approval, low_stock, order_status, system
    title: text('title').notNull(),
    message: text('message').notNull(),
    relatedDocumentType: text('related_document_type'), // purchase_order, sales_order, product
    relatedDocumentId: uuid('related_document_id'),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    readAt: timestamp('read_at'),
  },
  (table) => ({
    idx1: index('notifications_tenant_user_idx').on(table.tenantId, table.userId),
    idx2: index('notifications_user_read_idx').on(table.userId, table.isRead),
    idx3: index('notifications_created_at_idx').on(table.createdAt),
  })
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
