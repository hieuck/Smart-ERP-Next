const mockDb: any = { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() };

jest.mock('@smart-erp/database', () => ({ db: mockDb }));
jest.mock('@smart-erp/database/schema', () => ({ chartOfAccounts: {} }));
jest.mock('drizzle-orm', () => ({
  eq: jest.fn((f: any, v: any) => ({ op: 'eq', field: f, value: v })),
  and: jest.fn((...c: any[]) => ({ op: 'and', conditions: c })),
  like: jest.fn((f: any, v: any) => ({ op: 'like', field: f, value: v })),
  or: jest.fn((...c: any[]) => ({ op: 'or', conditions: c })),
}));
jest.mock('@smart-erp/accounting', () => ({
  DEFAULT_ACCOUNTS: {
    ASSET: { '1000': { name: 'Cash' }, '1100': { name: 'Accounts Receivable' } },
    LIABILITY: { '2000': { name: 'Accounts Payable' } },
    EQUITY: { '3000': { name: 'Owner Equity' } },
    REVENUE: { '4000': { name: 'Revenue' } },
    EXPENSE: { '5000': { name: 'Expense' } },
  },
  ACCOUNT_TYPES: {
    ASSET: 'asset', LIABILITY: 'liability', EQUITY: 'equity', REVENUE: 'revenue', EXPENSE: 'expense',
  },
}));

import { ChartOfAccountsService } from '../accounting/chart-of-accounts.service';

describe('ChartOfAccountsService', () => {
  let service: ChartOfAccountsService;
  const TENANT_ID = 'tenant-1';
  const selectQueue: any[][] = [];
  const returningQueue: any[][] = [];

  const makeSelectChain = (rows: any[]) => {
    const chain: any = {
      from: jest.fn(() => chain),
      where: jest.fn(() => chain),
      orderBy: jest.fn(() => chain),
      limit: jest.fn(() => chain),
      then: jest.fn((resolve: any, reject?: any) => Promise.resolve(rows).then(resolve, reject)),
    };
    return chain;
  };

  const makeWriteChain = () => {
    const chain: any = {
      values: jest.fn(() => chain),
      set: jest.fn(() => chain),
      where: jest.fn(() => chain),
      returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
      then: jest.fn((resolve: any, reject?: any) => Promise.resolve(undefined).then(resolve, reject)),
    };
    return chain;
  };

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

  describe('create', () => {
    it('creates an account with all fields', async () => {
      const dto = {
        accountCode: '1000',
        accountName: 'Cash',
        accountType: 'asset',
        description: 'Cash on hand',
        isActive: true,
        parentId: null,
      };
      const expected = { id: 'acc-1', accountCode: '1000', accountName: 'Cash', accountType: 'asset' };
      returningQueue.push([expected]);

      const result = await service.create(TENANT_ID, dto as any);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });

    it('defaults isActive to true when not provided', async () => {
      const dto = { accountCode: '1000', accountName: 'Cash', accountType: 'asset' };
      returningQueue.push([{ id: 'acc-1', isActive: true }]);

      const result = await service.create(TENANT_ID, dto as any);

      expect(result.isActive).toBe(true);
    });
  });

  describe('findAll', () => {
    it('returns all accounts for a tenant', async () => {
      const accounts = [
        { id: 'acc-1', accountCode: '1000', accountName: 'Cash', accountType: 'asset' },
        { id: 'acc-2', accountCode: '2000', accountName: 'Payable', accountType: 'liability' },
      ];
      selectQueue.push(accounts);

      const result = await service.findAll(TENANT_ID);

      expect(result).toEqual(accounts);
    });

    it('filters by account type', async () => {
      selectQueue.push([{ id: 'acc-1', accountCode: '1000', accountName: 'Cash', accountType: 'asset' }]);

      const result = await service.findAll(TENANT_ID, { type: 'asset' });

      expect(result).toHaveLength(1);
      expect(result[0].accountType).toBe('asset');
    });

    it('filters by isActive status', async () => {
      selectQueue.push([{ id: 'acc-1', accountCode: '1000', isActive: false }]);

      const result = await service.findAll(TENANT_ID, { isActive: false });

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(false);
    });

    it('searches by code or name', async () => {
      selectQueue.push([{ id: 'acc-1', accountCode: '1000', accountName: 'Cash' }]);

      const result = await service.findAll(TENANT_ID, { search: 'Cash' });

      expect(result).toHaveLength(1);
    });

    it('combines multiple filters', async () => {
      selectQueue.push([]);

      const result = await service.findAll(TENANT_ID, { type: 'asset', isActive: true, search: 'Cash' });

      expect(result).toEqual([]);
    });

    it('returns empty array when no accounts match', async () => {
      selectQueue.push([]);

      const result = await service.findAll(TENANT_ID, { type: 'nonexistent' });

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns an account by id', async () => {
      const account = { id: 'acc-1', accountCode: '1000', accountName: 'Cash' };
      selectQueue.push([account]);

      const result = await service.findOne(TENANT_ID, 'acc-1');

      expect(result).toEqual(account);
    });

    it('returns null when account not found', async () => {
      selectQueue.push([]);

      const result = await service.findOne(TENANT_ID, 'missing');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates account fields and returns updated account', async () => {
      const dto = { accountName: 'Updated Name', description: 'Updated description' };
      const expected = { id: 'acc-1', accountName: 'Updated Name', description: 'Updated description' };
      returningQueue.push([expected]);

      const result = await service.update(TENANT_ID, 'acc-1', dto as any);

      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  describe('delete', () => {
    it('deletes a non-system account', async () => {
      selectQueue.push([{ id: 'acc-1', isActive: true, isSystem: false }]);

      const result = await service.delete(TENANT_ID, 'acc-1');

      expect(result).toEqual({ success: true });
    });

    it('returns error when account not found', async () => {
      selectQueue.push([]);

      const result = await service.delete(TENANT_ID, 'missing');

      expect(result).toEqual({ success: false, error: 'Account not found' });
    });

    it('returns error when account is system-protected', async () => {
      selectQueue.push([{ id: 'acc-sys', isSystem: true }]);

      const result = await service.delete(TENANT_ID, 'acc-sys');

      expect(result).toEqual({ success: false, error: 'Cannot delete system account' });
    });
  });

  describe('getAccountTree', () => {
    it('builds nested tree from parent-child relationships', async () => {
      const accounts = [
        { id: 'asset', accountCode: '1000', parentId: null, isActive: true },
        { id: 'cash', accountCode: '1100', parentId: 'asset', isActive: true },
      ];
      selectQueue.push(accounts);

      const result = await service.getAccountTree(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('asset');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('cash');
      expect(result[0].children[0].children).toEqual([]);
    });

    it('treats orphan accounts (missing parentId) as roots', async () => {
      const accounts = [
        { id: 'orphan', accountCode: '9999', parentId: 'nonexistent', isActive: true },
      ];
      selectQueue.push(accounts);

      const result = await service.getAccountTree(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('orphan');
    });

    it('returns empty array when no accounts exist', async () => {
      selectQueue.push([]);

      const result = await service.getAccountTree(TENANT_ID);

      expect(result).toEqual([]);
    });
  });

  describe('seedDefaultAccounts', () => {
    it('creates default accounts from all account types for tenant with no existing accounts', async () => {
      selectQueue.push([]);
      const created = Array.from({ length: 6 }, (_, i) => ({
        id: `acc-${i + 1}`,
        accountCode: ['1000', '1100', '2000', '3000', '4000', '5000'][i],
        accountName: ['Cash', 'Accounts Receivable', 'Accounts Payable', 'Owner Equity', 'Revenue', 'Expense'][i],
      }));
      returningQueue.push(created);

      const result = await service.seedDefaultAccounts(TENANT_ID);

      expect(result).toEqual({ success: true, count: 6, accounts: created });
    });

    it('returns error when accounts already exist for tenant', async () => {
      selectQueue.push([{ id: 'existing', accountCode: '1000' }]);

      const result = await service.seedDefaultAccounts(TENANT_ID);

      expect(result).toEqual({ success: false, error: 'Accounts already exist for this tenant' });
    });
  });
});
