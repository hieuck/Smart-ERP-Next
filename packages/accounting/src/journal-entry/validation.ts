import { z } from 'zod';

export const journalEntryLineSchema = z.object({
  accountId: z.string().uuid(),
  debit: z.number().min(0).optional(),
  credit: z.number().min(0).optional(),
  description: z.string().max(500).optional(),
  costCenterId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  partnerId: z.string().uuid().optional().nullable(),
  taxRate: z.number().min(0).max(100).optional(),
  taxAmount: z.number().min(0).optional(),
  lineNumber: z.string().max(20).optional(),
});

export const journalEntrySchema = z.object({
  voucherTypeId: z.string().uuid().optional().nullable(),
  voucherDate: z.coerce.date(),
  description: z.string().max(1000).optional(),
  reference: z.string().max(100).optional(),
  lines: z.array(journalEntryLineSchema).min(2, 'Ít nhất 2 dòng bút toán'),
  attachments: z.array(z.string()).optional(),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  },
  { message: 'Tổng nợ và tổng có phải bằng nhau', path: ['lines'] }
);

export const postJournalEntrySchema = z.object({
  entryId: z.string().uuid(),
});

export const reverseJournalEntrySchema = z.object({
  entryId: z.string().uuid(),
  reverseDate: z.coerce.date().optional(),
  reason: z.string().max(500).optional(),
});

export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
export type JournalEntryLineInput = z.infer<typeof journalEntryLineSchema>;