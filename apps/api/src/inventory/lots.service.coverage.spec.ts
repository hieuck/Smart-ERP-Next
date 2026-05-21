const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  productLots: {
    tenantId: 'productLots.tenantId',
    lotNumber: 'productLots.lotNumber',
    productId: 'productLots.productId',
    warehouseId: 'productLots.warehouseId',
    expiryDate: 'productLots.expiryDate',
    id: 'productLots.id',
    isActive: 'productLots.isActive',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { LotsService } from './lots.service';

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

describe('LotsService coverage', () => {
  const activityService = { log: jest.fn() };
  let service: LotsService;

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
    service = new LotsService(activityService as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates unique lots and logs activity', async () => {
    selectQueue.push([{ id: 'existing' }]);
    await expect(service.create('tenant-1', 'user-1', { lotNumber: 'LOT-1' })).rejects.toBeInstanceOf(ConflictException);

    selectQueue.push([]);
    returningQueue.push([{ id: 'lot-1', lotNumber: 'LOT-1', quantity: 10 }]);
    await expect(service.create('tenant-1', 'user-1', {
      productId: 'product-1',
      lotNumber: 'LOT-1',
      expiryDate: '2026-12-31',
      quantity: 10,
    })).resolves.toEqual({ id: 'lot-1', lotNumber: 'LOT-1', quantity: 10 });
    expect(activityService.log).toHaveBeenCalledWith('tenant-1', 'user-1', 'created', 'lot', 'lot-1', {
      lotNumber: 'LOT-1',
      quantity: 10,
    });

    selectQueue.push([]);
    returningQueue.push([{ id: 'lot-2', lotNumber: 'LOT-2', quantity: 5 }]);
    await expect(service.create('tenant-1', 'user-1', {
      productId: 'product-1',
      lotNumber: 'LOT-2',
      quantity: 5,
      receivedDate: '2026-05-20',
      warehouseId: 'wh-1',
    })).resolves.toEqual({ id: 'lot-2', lotNumber: 'LOT-2', quantity: 5 });
  });

  it('lists and finds lots including expiration filters', async () => {
    selectQueue.push([{ id: 'lot-1' }], [{ id: 'expiring' }], [{ id: 'expiring-default' }], [], [{ id: 'lot-1' }]);

    await expect(service.findAll('tenant-1', { productId: 'product-1', warehouseId: 'wh-1', includeExpired: false })).resolves.toEqual([{ id: 'lot-1' }]);
    await expect(service.getExpiringSoon('tenant-1', 15)).resolves.toEqual([{ id: 'expiring' }]);
    await expect(service.getExpiringSoon('tenant-1')).resolves.toEqual([{ id: 'expiring-default' }]);
    await expect(service.findOne('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne('tenant-1', 'lot-1')).resolves.toEqual({ id: 'lot-1' });
  });

  it('updates and removes lots with audit logs and not-found handling', async () => {
    returningQueue.push([], [{ id: 'lot-1', lotNumber: 'LOT-1' }], [], [{ id: 'lot-1', lotNumber: 'LOT-1' }]);

    await expect(service.update('tenant-1', 'user-1', 'missing', { quantity: 5 })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update('tenant-1', 'user-1', 'lot-1', { expiryDate: '2027-01-01' })).resolves.toEqual({ id: 'lot-1', lotNumber: 'LOT-1' });
    await expect(service.remove('tenant-1', 'user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('tenant-1', 'user-1', 'lot-1')).resolves.toEqual({ id: 'lot-1', lotNumber: 'LOT-1' });

    expect(activityService.log).toHaveBeenCalledWith('tenant-1', 'user-1', 'updated', 'lot', 'lot-1', expect.any(Object));
    expect(activityService.log).toHaveBeenCalledWith('tenant-1', 'user-1', 'deleted', 'lot', 'lot-1', { lotNumber: 'LOT-1' });
  });
});
