import {
  createChartOfAccountSchema,
  createJournalEntrySchema,
  updateChartOfAccountSchema,
} from './index';

describe('accounting DTO schemas', () => {
  it('applies chart account defaults and allows partial updates', () => {
    expect(createChartOfAccountSchema.parse({
      accountCode: '111',
      accountName: 'Cash',
      accountType: 'asset',
      currency: 'VND',
    })).toMatchObject({
      accountCode: '111',
      isActive: true,
      currency: 'VND',
    });

    expect(updateChartOfAccountSchema.parse({ accountName: 'Updated cash' })).toEqual({ accountName: 'Updated cash' });
  });

  it('accepts balanced journal entries and rejects unbalanced entries', () => {
    const balanced = {
      voucherDate: '2026-05-21',
      lines: [
        { accountId: '00000000-0000-4000-8000-000000000001', debit: 100 },
        { accountId: '00000000-0000-4000-8000-000000000002', credit: 100 },
      ],
    };

    expect(createJournalEntrySchema.parse(balanced).lines).toHaveLength(2);
    expect(() => createJournalEntrySchema.parse({
      voucherDate: '2026-05-21',
      lines: [
        { accountId: '00000000-0000-4000-8000-000000000001', debit: 100 },
        { accountId: '00000000-0000-4000-8000-000000000002', credit: 90 },
      ],
    })).toThrow('Entry must be balanced');
  });
});
