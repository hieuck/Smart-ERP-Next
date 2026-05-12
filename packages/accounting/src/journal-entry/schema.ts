import { pgTable, text, decimal, boolean, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from '@smart-erp/database/schema';
import { chartOfAccounts } from '../chart-of-accounts/schema';
import { voucherTypes } from '../voucher-types/schema';

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  voucherTypeId: uuid('voucher_type_id').references(() => voucherTypes.id),
  voucherNumber: text('voucher_number').notNull(),
  voucherDate: timestamp('voucher_date').notNull(),
  description: text('description'),
  reference: text('reference'),
  totalAmount: decimal('total_amount', { precision: 18, scale: 2 }),
  isPosted: boolean('is_posted').default(false),
  postedAt: timestamp('posted_at'),
  postedBy: uuid('posted_by'),
  isReversed: boolean('is_reversed').default(false),
  reversedFromId: uuid('reversed_from_id'),
  attachments: jsonb('attachments').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: uuid('created_by'),
});

export const journalEntryLines = pgTable('journal_entry_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  journalEntryId: uuid('journal_entry_id').notNull().references(() => journalEntries.id),
  accountId: uuid('account_id').notNull().references(() => chartOfAccounts.id),
  debit: decimal('debit', { precision: 18, scale: 2 }).default('0'),
  credit: decimal('credit', { precision: 18, scale: 2 }).default('0'),
  description: text('description'),
  costCenterId: uuid('cost_center_id'),
  projectId: uuid('project_id'),
  partnerId: uuid('partner_id'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }),
  taxAmount: decimal('tax_amount', { precision: 18, scale: 2 }),
  lineNumber: text('line_number'),
});

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type NewJournalEntryLine = typeof journalEntryLines.$inferInsert;