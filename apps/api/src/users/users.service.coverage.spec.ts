const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  execute: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  users: {
    id: 'users.id',
    email: 'users.email',
    name: 'users.name',
    role: 'users.role',
    tenantId: 'users.tenantId',
    createdAt: 'users.createdAt',
    updatedAt: 'users.updatedAt',
  },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  ilike: jest.fn((field, value) => ({ op: 'ilike', field, value })),
  or: jest.fn((...conditions) => ({ op: 'or', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

const selectQueue: any[][] = [];
const returningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => Promise.resolve(rows)),
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

describe('UsersService coverage', () => {
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    mockDb.delete.mockImplementation(() => makeWriteChain());
    service = new UsersService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('validates tenant and email uniqueness before creating users', async () => {
    await expect(service.create({ email: 'a@test.com' } as any)).rejects.toBeInstanceOf(BadRequestException);

    selectQueue.push([{ id: 'existing' }]);
    await expect(service.create({ email: 'a@test.com', tenantId: 'tenant-1' } as any)).rejects.toBeInstanceOf(ConflictException);

    selectQueue.push([]);
    returningQueue.push([{ id: 'user-1', email: 'a@test.com' }]);
    await expect(service.create({ email: 'a@test.com', tenantId: 'tenant-1', name: 'A' } as any)).resolves.toEqual({ id: 'user-1', email: 'a@test.com' });

    selectQueue.push([]);
    returningQueue.push([{ id: 'user-2', email: 'b@test.com', name: null }]);
    await expect(service.create({ email: 'b@test.com', tenantId: 'tenant-1' } as any)).resolves.toEqual({
      id: 'user-2',
      email: 'b@test.com',
      name: null,
    });
    expect(mockDb.insert.mock.results[1].value.values).toHaveBeenCalledWith(expect.objectContaining({
      email: 'b@test.com',
      name: null,
      role: 'user',
    }));
  });

  it('finds users by tenant, id, and email with not-found handling', async () => {
    selectQueue.push([{ id: 'user-1' }], [], [{ id: 'user-1' }], [{ id: 'user-email' }]);

    await expect(service.findAll('tenant-1', 'lan')).resolves.toEqual([{ id: 'user-1' }]);
    await expect(service.findOne('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne('tenant-1', 'user-1')).resolves.toEqual({ id: 'user-1' });
    await expect(service.findByEmail('a@test.com')).resolves.toEqual({ id: 'user-email' });
  });

  it('updates, updates profile, removes users, and summarizes role stats', async () => {
    returningQueue.push([], [{ id: 'user-1', name: 'Lan' }], [], [{ id: 'user-1' }], [], [{ id: 'user-1' }]);

    await expect(service.update('tenant-1', 'missing', { name: 'X' } as any)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update('tenant-1', 'user-1', { name: 'Lan' } as any)).resolves.toEqual({ id: 'user-1', name: 'Lan' });
    await expect(service.updateProfile('tenant-1', 'missing', { name: 'X' } as any)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.updateProfile('tenant-1', 'user-1', { name: 'Lan' } as any)).resolves.toEqual({ id: 'user-1' });
    await expect(service.remove('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('tenant-1', 'user-1')).resolves.toEqual({ id: 'user-1' });

    selectQueue.push([{ total: 3 }]);
    mockDb.execute.mockResolvedValueOnce({ rows: [{ role: 'admin', count: 1 }, { role: 'user', count: 2 }] });
    await expect(service.getStats('tenant-1')).resolves.toEqual({
      total: 3,
      byRole: { admin: 1, user: 2 },
    });
  });
});
