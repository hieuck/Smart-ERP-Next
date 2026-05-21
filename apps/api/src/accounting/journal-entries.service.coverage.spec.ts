const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/accounting', () => ({
  journalEntries: {
    id: 'journalEntries.id',
    tenantId: 'journalEntries.tenantId',
    voucherDate: 'journalEntries.voucherDate',
    isPosted: 'journalEntries.isPosted',
  },
  journalEntryLines: {
    id: 'journalEntryLines.id',
    accountId: 'journalEntryLines.accountId',
    journalEntryId: 'journalEntryLines.journalEntryId',
    debit: 'journalEntryLines.debit',
    credit: 'journalEntryLines.credit',
    description: 'journalEntryLines.description',
    taxRate: 'journalEntryLines.taxRate',
    taxAmount: 'journalEntryLines.taxAmount',
    lineNumber: 'journalEntryLines.lineNumber',
  },
  chartOfAccounts: {
    id: 'chartOfAccounts.id',
    accountCode: 'chartOfAccounts.accountCode',
    accountName: 'chartOfAccounts.accountName',
    accountType: 'chartOfAccounts.accountType',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  gte: jest.fn((field, value) => ({ op: 'gte', field, value })),
  lte: jest.fn((field, value) => ({ op: 'lte', field, value })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
}));

jest.mock('uuid', () => ({ v4: jest.fn() }));

import { BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { JournalEntriesService } from './journal-entries.service';

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

const makeWriteChain = () => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('JournalEntriesService coverage', () => {
  let service: JournalEntriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T03:00:00.000Z'));
    selectQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    service = new JournalEntriesService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const balancedDto = {
    voucherDate: '2026-05-21',
    description: 'Thu tien ban hang',
    reference: 'SO-001',
    lines: [
      { accountId: 'cash', debit: 1000, description: 'Cash' },
      { accountId: 'revenue', credit: 1000, taxRate: 10, taxAmount: 100, description: 'Revenue' },
    ],
  };

  it('rejects unbalanced entries and creates balanced entries with generated voucher numbers', async () => {
    await expect(service.create('tenant-1', 'user-1', {
      ...balancedDto,
      lines: [
        { accountId: 'cash', debit: 1000 },
        { accountId: 'revenue', credit: 900 },
      ],
    } as any)).rejects.toBeInstanceOf(BadRequestException);

    (uuid as jest.Mock).mockReturnValueOnce('entry-new');
    selectQueue.push(
      [{ id: 'old-entry' }],
      [{ id: 'entry-new', voucherNumber: 'BC2026000002', totalAmount: '1000' }],
      [
        { accountId: 'cash', debit: '1000', credit: '0' },
        { accountId: 'revenue', debit: '0', credit: '1000' },
      ],
    );

    await expect(service.create('tenant-1', 'user-1', balancedDto as any)).resolves.toMatchObject({
      id: 'entry-new',
      voucherNumber: 'BC2026000002',
      totalDebit: 1000,
      totalCredit: 1000,
    });
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });

  it('lists and finds entries with line totals and null fallback', async () => {
    const fromDate = new Date('2026-05-01');
    const toDate = new Date('2026-05-31');
    selectQueue.push([{ id: 'entry-1' }, { id: 'entry-2' }]);
    await expect(service.findAll('tenant-1', {
      page: 2,
      limit: 10,
      isPosted: true,
      fromDate,
      toDate,
    })).resolves.toEqual({
      items: [{ id: 'entry-1' }, { id: 'entry-2' }],
      total: 2,
      page: 2,
      limit: 10,
    });

    selectQueue.push([{ id: 'entry-defaults' }]);
    await expect(service.findAll('tenant-1')).resolves.toEqual({
      items: [{ id: 'entry-defaults' }],
      total: 1,
      page: 1,
      limit: 50,
    });

    selectQueue.push([], [{ id: 'entry-1', totalAmount: '200' }], [
      { accountId: 'cash', debit: '200', credit: '0' },
      { accountId: 'revenue', debit: '0', credit: '200' },
    ]);

    await expect(service.findOne('tenant-1', 'missing')).resolves.toBeNull();
    await expect(service.findOne('tenant-1', 'entry-1')).resolves.toMatchObject({
      id: 'entry-1',
      totalDebit: 200,
      totalCredit: 200,
    });

    selectQueue.push([{ id: 'entry-empty-lines', totalAmount: '0' }], [
      { accountId: 'memo', debit: null, credit: undefined },
    ]);
    await expect(service.findOne('tenant-1', 'entry-empty-lines')).resolves.toMatchObject({
      id: 'entry-empty-lines',
      totalDebit: 0,
      totalCredit: 0,
    });
  });

  it('posts entries and validates not-found or already-posted states', async () => {
    jest.spyOn(service, 'findOne')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'entry-1', isPosted: true } as any)
      .mockResolvedValueOnce({ id: 'entry-1', isPosted: false } as any);

    await expect(service.post('tenant-1', 'user-1', 'missing')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.post('tenant-1', 'user-1', 'entry-1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.post('tenant-1', 'user-1', 'entry-1')).resolves.toEqual({
      success: true,
      entryId: 'entry-1',
    });
  });

  it('reverses posted entries and rejects invalid reverse states', async () => {
    jest.spyOn(service, 'findOne')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'entry-1', isPosted: false } as any)
      .mockResolvedValueOnce({ id: 'entry-1', isPosted: true, isReversed: true } as any)
      .mockResolvedValueOnce({
        id: 'entry-1',
        voucherNumber: 'BC2026000001',
        totalAmount: '1000',
        isPosted: true,
        isReversed: false,
        lines: [
          { accountId: 'cash', debit: '1000', credit: '0', description: 'Cash' },
          { accountId: 'revenue', debit: '0', credit: '1000', description: 'Revenue' },
        ],
      } as any);
    (uuid as jest.Mock).mockReturnValueOnce('reverse-entry').mockReturnValueOnce('reverse-entry-no-reason');
    selectQueue.push([{ id: 'old-entry' }]);

    await expect(service.reverse('tenant-1', 'user-1', 'missing')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.reverse('tenant-1', 'user-1', 'entry-1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.reverse('tenant-1', 'user-1', 'entry-1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.reverse('tenant-1', 'user-1', 'entry-1', 'Sai so tien')).resolves.toEqual({
      success: true,
      originalEntryId: 'entry-1',
      reverseEntryId: 'reverse-entry',
    });

    jest.spyOn(service, 'findOne').mockResolvedValueOnce({
      id: 'entry-2',
      voucherNumber: 'BC2026000002',
      totalAmount: '500',
      isPosted: true,
      isReversed: false,
      lines: [{ accountId: 'cash', debit: '500', credit: '0', description: 'Cash' }],
    } as any);
    selectQueue.push([{ id: 'old-entry-2' }]);
    await expect(service.reverse('tenant-1', 'user-1', 'entry-2')).resolves.toEqual({
      success: true,
      originalEntryId: 'entry-2',
      reverseEntryId: 'reverse-entry-no-reason',
    });
  });

  it('builds trial balance for empty and populated ledgers', async () => {
    selectQueue.push([]);
    await expect(service.getTrialBalance('tenant-1')).resolves.toEqual({
      items: [],
      totalDebit: 0,
      totalCredit: 0,
    });

    selectQueue.push([{ id: 'entry-1' }], [
      { accountId: 'cash', accountCode: '111', accountName: 'Tien mat', accountType: 'asset', debit: '1000', credit: '0' },
      { accountId: 'cash', accountCode: '111', accountName: 'Tien mat', accountType: 'asset', debit: '500', credit: '0' },
      { accountId: 'revenue', accountCode: '511', accountName: 'Doanh thu', accountType: 'income', debit: '0', credit: '1500' },
      { accountId: 'memo', accountCode: '000', accountName: 'Memo', accountType: 'memo', debit: null, credit: undefined },
    ]);

    await expect(service.getTrialBalance('tenant-1', new Date('2026-05-01'), new Date('2026-05-31'))).resolves.toEqual({
      items: [
        { accountId: 'cash', accountCode: '111', accountName: 'Tien mat', accountType: 'asset', debit: 1500, credit: 0 },
        { accountId: 'revenue', accountCode: '511', accountName: 'Doanh thu', accountType: 'income', debit: 0, credit: 1500 },
        { accountId: 'memo', accountCode: '000', accountName: 'Memo', accountType: 'memo', debit: 0, credit: 0 },
      ],
      totalDebit: 1500,
      totalCredit: 1500,
      isBalanced: true,
    });
  });
});
