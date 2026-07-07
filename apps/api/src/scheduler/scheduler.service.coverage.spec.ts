const mockDb = {
  select: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  products: {
    tenantId: 'products.tenantId',
    stock: 'products.stock',
    minStock: 'products.minStock',
    isActive: 'products.isActive',
  },
  activityLogs: {
    tenantId: 'activityLogs.tenantId',
    createdAt: 'activityLogs.createdAt',
  },
  tenants: {
    id: 'tenants.id',
  },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  sql: jest.fn((strings: TemplateStringsArray, ...values: any[]) => ({ strings, values })),
  lt: jest.fn((field, value) => ({ op: 'lt', field, value })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
}));

import { SchedulerService } from './scheduler.service';

const selectQueue: any[][] = [];

const makeSelectChain = () => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    then: jest.fn((onFulfilled: any, onRejected: any) =>
      Promise.resolve(selectQueue.shift() ?? []).then(onFulfilled, onRejected),
    ),
  };
  return chain;
};

const makeDeleteChain = () => {
  const chain: any = {
    where: jest.fn(() => chain),
    then: jest.fn((onFulfilled: any, onRejected: any) =>
      Promise.resolve({ rowCount: deleteQueue.shift() ?? 0 }).then(onFulfilled, onRejected),
    ),
  };
  return chain;
};

const deleteQueue: (number | undefined)[] = [];

describe('SchedulerService tenant-scoped cron jobs', () => {
  let service: SchedulerService;

  beforeEach(() => {
    jest.clearAllMocks();
    selectQueue.length = 0;
    deleteQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain());
    mockDb.delete.mockImplementation(() => makeDeleteChain());
    service = new SchedulerService();
  });

  describe('checkLowStock', () => {
    it('queries tenants then products per tenant and returns total checked count', async () => {
      selectQueue.push(
        [{ id: 't1' }, { id: 't2' }],
        [{ id: 'p1' }, { id: 'p2' }],
        [{ id: 'p3' }],
      );

      const result = await service.checkLowStock();

      expect(mockDb.select).toHaveBeenCalledTimes(3);
      expect(mockDb.delete).not.toHaveBeenCalled();
      expect(result.checked).toBe(3);
    });

    it('returns zero when no tenants exist', async () => {
      selectQueue.push([]);

      const result = await service.checkLowStock();

      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(result.checked).toBe(0);
    });
  });

  describe('cleanupOldLogs', () => {
    it('deletes logs per tenant and returns total deleted count', async () => {
      selectQueue.push([{ id: 't1' }, { id: 't2' }]);
      deleteQueue.push(5, 7);

      const result = await service.cleanupOldLogs();

      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(mockDb.delete).toHaveBeenCalledTimes(2);
      expect(result.deleted).toBe(12);
    });

    it('returns zero when no tenants exist', async () => {
      selectQueue.push([]);

      const result = await service.cleanupOldLogs();

      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(mockDb.delete).not.toHaveBeenCalled();
      expect(result.deleted).toBe(0);
    });
  });

  describe('handleCron', () => {
    it('runs checkLowStock and cleanupOldLogs', async () => {
      selectQueue.push([], []);
      const checkSpy = jest.spyOn(service, 'checkLowStock').mockResolvedValue({ checked: 0 });
      const cleanupSpy = jest.spyOn(service, 'cleanupOldLogs').mockResolvedValue({ deleted: 0 });

      await service.handleCron();

      expect(checkSpy).toHaveBeenCalled();
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});
