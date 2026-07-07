import { pgTable, uuid, text, timestamp, numeric, index, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

// Phiếu thu/chi
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    // receipt = phiếu thu, payment = phiếu chi
    type: text('type').notNull(), // receipt | payment
    // order, purchase_order, manual
    referenceType: text('reference_type'),
    referenceId: uuid('reference_id'),
    // Đối tượng: customer, supplier, employee, other
    partyType: text('party_type'),
    partyId: uuid('party_id'),
    partyName: text('party_name'),
    amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
    // cash, bank_transfer, card, momo, vnpay, zalopay, credit
    method: text('method').notNull().default('cash'),
    bankAccount: text('bank_account'),
    transactionRef: text('transaction_ref'),
    // pending, completed, failed, refunded
    status: text('status').notNull().default('completed'),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    paidAt: timestamp('paid_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index('payments_tenant_idx').on(table.tenantId),
    codeUnique: unique('payments_tenant_code_unique').on(table.tenantId, table.code),
    referenceIdx: index('payments_reference_idx').on(table.referenceId),
    paidAtIdx: index('payments_paid_at_idx').on(table.paidAt),
    // Composite index for tenant+status (common in payment filtering)
    tenantStatusIdx: index('payments_tenant_status_idx').on(table.tenantId, table.status),
  })
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
