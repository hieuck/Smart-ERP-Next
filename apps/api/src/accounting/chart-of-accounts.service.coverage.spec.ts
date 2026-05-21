const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/accounting', () => ({
  chartOfAccounts: {
    id: 'chartOfAccounts.id',
    tenantId: 'chartOfAccounts.tenantId',
    accountCode: 'chartOfAccounts.accountCode',
    accountName: 'chartOfAccounts.accountName',
    accountNameEn: 'chartOfAccounts.accountNameEn',
    accountType: 'chartOfAccounts.accountType',
    parentId: 'chartOfAccounts.parentId',
    isActive: 'chartOfAccounts.isActive',
  },
  ACCOUNT_TYPES: {
    ASSET: 'asset',
    LIABILITY: 'liability',
    EQUITY: 'equity',
    REVENUE: 'revenue',
    EXPENSE: 'expense',
  },
  DEFAULT_ACCOUNTS: {
    ASSET: { '1111': { name: 'Tien mat', nameEn: 'Cash' } },
    LIABILITY: { '3311': { name: 'Phai tra', nameEn: 'Payable' } },
    EQUITY: { '4111': { name: 'Von chu so huu', nameEn: 'Equity' } },
    REVENUE: { '5111': { name: 'Doanh thu', nameEn: 'Revenue' } },
    EXPENSE: { '6421': { name: 'Chi phi', nameEn: 'Expense' } },
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  like: jest.fn((field, value) => ({ op: 'like', field, value })),
  or: jest.fn((...conditions) => ({ op: 'or', conditions })),
  isNull: jest.fn((field) => ({ op: 'isNull', field })),
}));

import { ChartOfAccountsService } from './chart-of-accounts.service';

const selectQueue: any[][] = [];
const returningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeWriteChain = () => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('ChartOfAccountsService coverage', () => {
  let service: ChartOfAccountsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T03:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    mockDb.delete.mockImplementation(() => makeWriteChain());
    service = new ChartOfAccountsService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates, filters, finds, and updates chart accounts', async () => {
    returningQueue.push([{ id: 'acc-1', accountCode: '1111', currency: 'VND' }]);
    await expect(service.create('tenant-1', {
      accountCode: '1111',
      accountName: 'Tien mat',
      accountNameEn: 'Cash',
      accountType: 'asset',
      description: 'Cash on hand',
    } as any)).resolves.toEqual({ id: 'acc-1', accountCode: '1111', currency: 'VND' });

    selectQueue.push([{ id: 'acc-1' }], [], [{ id: 'acc-1', accountName: 'Cash' }]);
    await expect(service.findAll('tenant-1', {
      type: 'asset',
      isActive: true,
      search: '111',
    })).resolves.toEqual([{ id: 'acc-1' }]);
    await expect(service.findOne('tenant-1', 'missing')).resolves.toBeNull();
    await expect(service.findOne('tenant-1', 'acc-1')).resolves.toEqual({ id: 'acc-1', accountName: 'Cash' });

    returningQueue.push([{ id: 'acc-1', accountName: 'Tien mat quy' }]);
    await expect(service.update('tenant-1', 'acc-1', {
      accountCode: '1111',
      accountName: 'Tien mat quy',
      accountType: 'asset',
      isActive: true,
    } as any)).resolves.toEqual({ id: 'acc-1', accountName: 'Tien mat quy' });
  });

  it('deletes only custom accounts and builds account trees', async () => {
    jest.spyOn(service, 'findOne')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'acc-system', isSystem: true } as any)
      .mockResolvedValueOnce({ id: 'acc-custom', isSystem: false } as any);

    await expect(service.delete('tenant-1', 'missing')).resolves.toEqual({
      success: false,
      error: 'Account not found',
    });
    await expect(service.delete('tenant-1', 'acc-system')).resolves.toEqual({
      success: false,
      error: 'Cannot delete system account',
    });
    await expect(service.delete('tenant-1', 'acc-custom')).resolves.toEqual({ success: true });

    selectQueue.push([
      { id: 'asset', accountCode: '1000', parentId: null },
      { id: 'cash', accountCode: '1111', parentId: 'asset' },
      { id: 'orphan', accountCode: '9999', parentId: 'missing' },
    ]);
    await expect(service.getAccountTree('tenant-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'asset',
        children: [expect.objectContaining({ id: 'cash', children: [] })],
      }),
      expect.objectContaining({ id: 'orphan', children: [] }),
    ]);
  });

  it('seeds default accounts only when tenant has no existing accounts', async () => {
    jest.spyOn(service, 'findAll')
      .mockResolvedValueOnce([{ id: 'existing' }] as any)
      .mockResolvedValueOnce([]);
    returningQueue.push([
      { id: 'acc-1' },
      { id: 'acc-2' },
      { id: 'acc-3' },
      { id: 'acc-4' },
      { id: 'acc-5' },
    ]);

    await expect(service.seedDefaultAccounts('tenant-1')).resolves.toEqual({
      success: false,
      error: 'Accounts already exist for this tenant',
    });
    await expect(service.seedDefaultAccounts('tenant-2')).resolves.toEqual({
      success: true,
      count: 5,
      accounts: [{ id: 'acc-1' }, { id: 'acc-2' }, { id: 'acc-3' }, { id: 'acc-4' }, { id: 'acc-5' }],
    });
  });
});
