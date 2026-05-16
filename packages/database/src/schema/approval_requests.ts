import { pgTable, uuid, text, timestamp, index, numeric } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { approvalRules } from './approval_rules';

export const approvalRequests = pgTable(
  'approval_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id').notNull(), // ID of the document being approved
    documentType: text('document_type').notNull(),
    ruleId: uuid('rule_id').references(() => approvalRules.id),
    requestedBy: uuid('requested_by').references(() => users.id),
    status: text('status').notNull().default('pending'), // pending, approved, rejected, cancelled
    currentStepIndex: numeric('current_step_index').default('0'),
    metadata: text('metadata'), // JSON string for additional context
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    idx1: index('approval_requests_tenant_idx').on(table.tenantId),
    idx2: index('approval_requests_document_idx').on(table.documentId, table.documentType),
    idx3: index('approval_requests_status_idx').on(table.status),
  })
);

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;
