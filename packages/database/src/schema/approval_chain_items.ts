import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { approvalRequests } from './approval_requests';

export const approvalChainItems = pgTable(
  'approval_chain_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requestId: uuid('request_id').notNull().references(() => approvalRequests.id, { onDelete: 'cascade' }),
    stepIndex: numeric('step_index').notNull(),
    approverId: uuid('approver_id').references(() => users.id),
    status: text('status').notNull().default('pending'), // pending, approved, rejected
    comments: text('comments'),
    notifiedAt: timestamp('notified_at'),
    respondedAt: timestamp('responded_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    idx1: index('approval_chain_items_request_idx').on(table.requestId),
    idx2: index('approval_chain_items_approver_idx').on(table.approverId),
  })
);

export type ApprovalChainItem = typeof approvalChainItems.$inferSelect;
export type NewApprovalChainItem = typeof approvalChainItems.$inferInsert;
