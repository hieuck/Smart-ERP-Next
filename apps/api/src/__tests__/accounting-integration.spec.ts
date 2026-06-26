const mockDb: any = { select: jest.fn() };

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

import { AccountingService } from '../accounting/accounting.service';

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

describe('AccountingService', () => {
  let service: AccountingService;
  const TENANT_ID = 'tenant-1';

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

  describe('getDashboard', () => {
    it('computes full dashboard with all account types', async () => {
      selectQueue.push(
        [{ id: 'entry-1', totalAmount: '1000' }],
        [
          { accountType: 'revenue', accountCode: '5111', debit: '0', credit: '2000' },
          { accountType: 'expense', accountCode: '6421', debit: '800', credit: '0' },
          { accountType: 'asset', accountCode: '1111', debit: '500', credit: '0' },
          { accountType: 'asset', accountCode: '1121', debit: '300', credit: '0' },
          { accountType: 'asset', accountCode: '1311', debit: '150', credit: '0' },
          { accountType: 'asset', accountCode: '1999', debit: '50', credit: '0' },
          { accountType: 'liability', accountCode: '3311', debit: '0', credit: '400' },
          { accountType: 'liability', accountCode: '3411', debit: '0', credit: '100' },
          { accountType: 'equity', accountCode: '4111', debit: '0', credit: '500' },
        ],
        [
          { id: 'entry-1', voucherNumber: 'BC2026000001', description: 'Sale', totalDebit: '1000', totalCredit: '1000', voucherDate: new Date('2026-05-21T00:00:00.000Z'), isPosted: true },
        ],
        ...Array.from({ length: 12 }, (_, m) => [{ totalAmount: String((m + 1) * 100) }]),
      );

      const result = await service.getDashboard(TENANT_ID, '2026');

      expect(result).toMatchObject({
        totalRevenue: 2000,
        totalExpense: 800,
        netIncome: 1200,
        totalAssets: 1000,
        totalLiabilities: 500,
        equity: 500,
        cashBalance: 500,
        bankBalance: 300,
        accountsReceivable: 150,
        accountsPayable: 400,
        netAssets: 0,
      });
      expect(result.monthlyCashflow).toHaveLength(12);
      expect(result.revenueTrend).toHaveLength(12);
      expect(result.recentJournalEntries).toHaveLength(1);
      expect(result.recentJournalEntries[0]).toMatchObject({
        voucherNumber: 'BC2026000001',
        totalDebit: 1000,
        totalCredit: 1000,
        voucherDate: '2026-05-21',
      });
    });

    it('returns zeros when no posted entries exist', async () => {
      selectQueue.push(
        [],
        [],
        ...Array.from({ length: 12 }, () => []),
      );

      const result = await service.getDashboard(TENANT_ID);

      expect(result).toMatchObject({
        totalRevenue: 0,
        totalExpense: 0,
        netIncome: 0,
        totalAssets: 0,
        totalLiabilities: 0,
        equity: 0,
        cashBalance: 0,
        bankBalance: 0,
        accountsReceivable: 0,
        accountsPayable: 0,
        recentJournalEntries: [],
      });
      expect(result.monthlyCashflow).toHaveLength(12);
    });

    it('handles null debit and credit values', async () => {
      selectQueue.push(
        [{ id: 'entry-1', totalAmount: '500' }],
        [
          { accountType: 'asset', accountCode: '1111', debit: null, credit: null },
          { accountType: 'revenue', accountCode: '5111', debit: null, credit: null },
        ],
        [],
        ...Array.from({ length: 12 }, () => []),
      );

      const result = await service.getDashboard(TENANT_ID, '2026');

      expect(result.totalRevenue).toBe(0);
      expect(result.totalAssets).toBe(0);
    });

    it('uses current year when no period is provided', async () => {
      selectQueue.push(
        [{ id: 'entry-1', totalAmount: '100' }],
        [
          { accountType: 'revenue', accountCode: '5111', debit: '0', credit: '100' },
        ],
        [],
        ...Array.from({ length: 12 }, () => [{ totalAmount: '0' }]),
      );

      const result = await service.getDashboard(TENANT_ID);

      expect(result.totalRevenue).toBe(100);
    });
  });

  describe('getReports', () => {
    it('returns placeholder with type and period', async () => {
      const result = await service.getReports(TENANT_ID, 'balance-sheet', '2026');

      expect(result).toEqual({
        type: 'balance-sheet',
        period: '2026',
        data: [],
      });
    });

    it('returns placeholder without optional params', async () => {
      const result = await service.getReports(TENANT_ID);

      expect(result).toEqual({
        type: undefined,
        period: undefined,
        data: [],
      });
    });
  });
});
