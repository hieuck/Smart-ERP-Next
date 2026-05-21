const mockDb = { select: jest.fn() };

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/accounting', () => ({
  chartOfAccounts: {
    id: 'chartOfAccounts.id',
    accountType: 'chartOfAccounts.accountType',
    accountCode: 'chartOfAccounts.accountCode',
  },
  journalEntries: {
    id: 'journalEntries.id',
    tenantId: 'journalEntries.tenantId',
    isPosted: 'journalEntries.isPosted',
    voucherDate: 'journalEntries.voucherDate',
    totalAmount: 'journalEntries.totalAmount',
    voucherNumber: 'journalEntries.voucherNumber',
    description: 'journalEntries.description',
  },
  journalEntryLines: {
    accountId: 'journalEntryLines.accountId',
    journalEntryId: 'journalEntryLines.journalEntryId',
    debit: 'journalEntryLines.debit',
    credit: 'journalEntryLines.credit',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  gte: jest.fn((field, value) => ({ op: 'gte', field, value })),
  lte: jest.fn((field, value) => ({ op: 'lte', field, value })),
}));

import { AccountingService } from './accounting.service';

const selectQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    leftJoin: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('AccountingService coverage', () => {
  let service: AccountingService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T03:00:00.000Z'));
    selectQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    service = new AccountingService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('computes accounting dashboard balances, monthly trend, and recent entries', async () => {
    selectQueue.push(
      [{ id: 'entry-1', totalAmount: '1000' }],
      [
        { accountType: 'revenue', accountCode: '5111', debit: '0', credit: '1500' },
        { accountType: 'expense', accountCode: '6421', debit: '500', credit: '0' },
        { accountType: 'asset', accountCode: '1111', debit: '700', credit: '100' },
        { accountType: 'asset', accountCode: '1121', debit: '300', credit: '0' },
        { accountType: 'asset', accountCode: '1311', debit: '200', credit: '0' },
        { accountType: 'asset', accountCode: '1999', debit: null, credit: null },
        { accountType: 'liability', accountCode: '3311', debit: '0', credit: '250' },
        { accountType: 'equity', accountCode: '4111', debit: '0', credit: '350' },
      ],
      [
        {
          id: 'entry-1',
          voucherNumber: 'BC2026000001',
          description: 'Sale',
          totalDebit: '1000',
          totalCredit: '1000',
          voucherDate: new Date('2026-05-21T00:00:00.000Z'),
          isPosted: true,
        },
      ],
      ...Array.from({ length: 12 }, (_, index) => [
        { totalAmount: String((index + 1) * 100) },
        ...(index === 0 ? [{ totalAmount: null }] : []),
      ]),
    );

    const dashboard = await service.getDashboard('tenant-1', '2026');

    expect(dashboard).toMatchObject({
      totalRevenue: 1500,
      totalExpense: 500,
      netIncome: 1000,
      cashBalance: 600,
      bankBalance: 300,
      accountsReceivable: 200,
      accountsPayable: 250,
      equity: 350,
      recentJournalEntries: [
        expect.objectContaining({
          voucherNumber: 'BC2026000001',
          totalDebit: 1000,
          totalCredit: 1000,
          voucherDate: '2026-05-21',
        }),
      ],
    });
    expect(dashboard.monthlyCashflow).toHaveLength(12);
    expect(dashboard.revenueTrend[0]).toEqual({ date: '1/T2026', amount: 100 });
  });

  it('returns empty dashboard defaults and placeholder reports', async () => {
    selectQueue.push(
      [],
      [],
      ...Array.from({ length: 12 }, () => []),
    );

    await expect(service.getDashboard('tenant-1')).resolves.toMatchObject({
      totalRevenue: 0,
      totalExpense: 0,
      netIncome: 0,
      monthlyCashflow: expect.any(Array),
      recentJournalEntries: [],
    });
    await expect(service.getReports('tenant-1', 'balance-sheet', '2026')).resolves.toEqual({
      type: 'balance-sheet',
      period: '2026',
      data: [],
    });
  });

  it('normalizes recent entries with missing debit and credit totals', async () => {
    selectQueue.push(
      [],
      [
        {
          id: 'entry-empty',
          voucherNumber: 'BC2026000002',
          description: 'Draft import',
          totalDebit: null,
          totalCredit: null,
          voucherDate: new Date('2026-05-22T00:00:00.000Z'),
          isPosted: false,
        },
      ],
      ...Array.from({ length: 12 }, () => []),
    );

    await expect(service.getDashboard('tenant-1', '2026')).resolves.toMatchObject({
      recentJournalEntries: [
        expect.objectContaining({
          totalDebit: 0,
          totalCredit: 0,
          voucherDate: '2026-05-22',
        }),
      ],
    });
  });
});
