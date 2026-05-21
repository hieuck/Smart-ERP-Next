const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  suppliers: {
    tenantId: 'suppliers.tenantId',
    code: 'suppliers.code',
    name: 'suppliers.name',
    phone: 'suppliers.phone',
    isActive: 'suppliers.isActive',
    id: 'suppliers.id',
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
import { SuppliersService } from './suppliers.service';

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

describe('SuppliersService coverage', () => {
  let service: SuppliersService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    mockDb.delete.mockImplementation(() => makeWriteChain());
    service = new SuppliersService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates suppliers only when code is unique', async () => {
    selectQueue.push([{ id: 'existing' }]);
    await expect(service.create('tenant-1', { code: 'SUP-1' } as any)).rejects.toBeInstanceOf(ConflictException);

    selectQueue.push([]);
    returningQueue.push([{ id: 'supplier-1', code: 'SUP-1' }]);
    await expect(service.create('tenant-1', { code: 'SUP-1', name: 'Supplier' } as any)).resolves.toEqual({ id: 'supplier-1', code: 'SUP-1' });
  });

  it('lists suppliers with search/active filters and handles detail not-found', async () => {
    selectQueue.push([{ count: 2 }], [{ id: 'supplier-1' }, { id: 'supplier-2' }], [], [{ id: 'supplier-1' }]);

    await expect(service.findAll('tenant-1', { page: 2, limit: 10, search: 'sup', isActive: true })).resolves.toEqual({
      items: [{ id: 'supplier-1' }, { id: 'supplier-2' }],
      total: 2,
      page: 2,
      limit: 10,
      totalPages: 1,
    });
    await expect(service.findOne('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne('tenant-1', 'supplier-1')).resolves.toEqual({ id: 'supplier-1' });

    selectQueue.push([{ count: 0 }], []);
    await expect(service.findAll('tenant-1', {} as any)).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });

  it('updates and removes suppliers with not-found handling', async () => {
    returningQueue.push([], [{ id: 'supplier-1', name: 'Updated' }], [], [{ id: 'supplier-1' }]);

    await expect(service.update('tenant-1', 'missing', { name: 'X' } as any)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update('tenant-1', 'supplier-1', { name: 'Updated' } as any)).resolves.toEqual({ id: 'supplier-1', name: 'Updated' });
    await expect(service.remove('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('tenant-1', 'supplier-1')).resolves.toEqual({ id: 'supplier-1' });
  });
});
