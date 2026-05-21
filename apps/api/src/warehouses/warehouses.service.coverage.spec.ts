const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  warehouses: {
    tenantId: 'warehouses.tenantId',
    code: 'warehouses.code',
    isDefault: 'warehouses.isDefault',
    isActive: 'warehouses.isActive',
    id: 'warehouses.id',
    name: 'warehouses.name',
  },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';

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
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('WarehousesService coverage', () => {
  let service: WarehousesService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    mockDb.delete.mockImplementation(() => makeWriteChain());
    service = new WarehousesService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates warehouses and clears previous default when requested', async () => {
    selectQueue.push([{ id: 'existing' }]);
    await expect(service.create('tenant-1', { code: 'WH-1', name: 'Main' })).rejects.toBeInstanceOf(ConflictException);

    selectQueue.push([]);
    returningQueue.push([{ id: 'wh-1', code: 'WH-1', isDefault: true }]);
    await expect(service.create('tenant-1', { code: 'WH-1', name: 'Main', isDefault: true })).resolves.toEqual({ id: 'wh-1', code: 'WH-1', isDefault: true });
    expect(mockDb.update).toHaveBeenCalledTimes(1);
  });

  it('lists active warehouses, finds default, and handles missing details', async () => {
    selectQueue.push([{ id: 'wh-1' }], [], [{ id: 'wh-1' }], [], [{ id: 'wh-default' }]);

    await expect(service.findAll('tenant-1')).resolves.toEqual([{ id: 'wh-1' }]);
    await expect(service.findOne('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne('tenant-1', 'wh-1')).resolves.toEqual({ id: 'wh-1' });
    await expect(service.findDefault('tenant-1')).resolves.toBeNull();
    await expect(service.findDefault('tenant-1')).resolves.toEqual({ id: 'wh-default' });
  });

  it('updates default warehouses and removes records', async () => {
    returningQueue.push([], [{ id: 'wh-1', isDefault: true }], [], [{ id: 'wh-1' }]);

    await expect(service.update('tenant-1', 'missing', { isDefault: true })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update('tenant-1', 'wh-1', { isDefault: true })).resolves.toEqual({ id: 'wh-1', isDefault: true });
    await expect(service.remove('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('tenant-1', 'wh-1')).resolves.toEqual({ id: 'wh-1' });
  });
});
