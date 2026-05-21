const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  customers: {
    tenantId: 'customers.tenantId',
    code: 'customers.code',
    name: 'customers.name',
    phone: 'customers.phone',
    customerGroup: 'customers.customerGroup',
    isActive: 'customers.isActive',
    id: 'customers.id',
  },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  ilike: jest.fn((field, value) => ({ op: 'ilike', field, value })),
  or: jest.fn((...conditions) => ({ op: 'or', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';

const selectQueue: any[][] = [];
const returningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    offset: jest.fn(() => chain),
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
  };
  return chain;
};

describe('CustomersService coverage', () => {
  const activityService = { log: jest.fn() };
  let service: CustomersService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    mockDb.delete.mockImplementation(() => makeWriteChain());
    activityService.log.mockResolvedValue(undefined);
    service = new CustomersService(activityService as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates unique customers and logs activity', async () => {
    selectQueue.push([{ id: 'existing' }]);
    await expect(service.create('tenant-1', 'user-1', { code: 'C1' } as any)).rejects.toBeInstanceOf(ConflictException);

    selectQueue.push([]);
    returningQueue.push([{ id: 'customer-1', code: 'C1', name: 'Lan', phone: '090' }]);
    await expect(service.create('tenant-1', 'user-1', { code: 'C1', name: 'Lan', phone: '090', debtLimit: 100 } as any)).resolves.toEqual({
      id: 'customer-1',
      code: 'C1',
      name: 'Lan',
      phone: '090',
    });
    expect(activityService.log).toHaveBeenCalledWith('tenant-1', 'user-1', 'created', 'customer', 'customer-1', {
      code: 'C1',
      name: 'Lan',
      phone: '090',
    });
  });

  it('lists customers with all filters and handles findOne', async () => {
    selectQueue.push([{ count: 1 }], [{ id: 'customer-1' }], [], [{ id: 'customer-1' }]);

    await expect(service.findAll('tenant-1', { page: 2, limit: 10, search: 'lan', group: 'VIP', isActive: true })).resolves.toEqual({
      items: [{ id: 'customer-1' }],
      total: 1,
      page: 2,
      limit: 10,
      totalPages: 1,
    });
    await expect(service.findOne('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne('tenant-1', 'customer-1')).resolves.toEqual({ id: 'customer-1' });

    selectQueue.push([{ count: 0 }], []);
    await expect(service.findAll('tenant-1', {} as any)).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });

  it('updates and removes customers with audit logs', async () => {
    returningQueue.push([], [{ id: 'customer-1' }], [], [{ id: 'customer-1', code: 'C1', name: 'Lan', phone: '090' }]);

    await expect(service.update('tenant-1', 'user-1', 'missing', { name: 'X' } as any)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update('tenant-1', 'user-1', 'customer-1', { debtLimit: 200, name: 'Lan' } as any)).resolves.toEqual({ id: 'customer-1' });
    await expect(service.remove('tenant-1', 'user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('tenant-1', 'user-1', 'customer-1')).resolves.toEqual({ id: 'customer-1', code: 'C1', name: 'Lan', phone: '090' });

    expect(activityService.log).toHaveBeenCalledWith('tenant-1', 'user-1', 'updated', 'customer', 'customer-1', {
      changes: ['debtLimit', 'name'],
    });
    expect(activityService.log).toHaveBeenCalledWith('tenant-1', 'user-1', 'deleted', 'customer', 'customer-1', expect.any(Object));
  });
});
