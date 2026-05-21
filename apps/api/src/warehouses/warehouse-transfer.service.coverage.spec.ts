jest.mock('@smart-erp/database', () => ({
  inventoryTransactions: {},
  warehouseTransfers: { tenantId: 'warehouseTransfers.tenantId', id: 'warehouseTransfers.id' },
  warehouseTransferItems: {},
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WarehouseTransferService } from './warehouse-transfer.service';

const makeWriteChain = (returningQueue: any[][]) => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    offset: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('WarehouseTransferService coverage', () => {
  const selectQueue: any[][] = [];
  const returningQueue: any[][] = [];
  const drizzle = {
    db: {
      insert: jest.fn(() => makeWriteChain(returningQueue)),
      update: jest.fn(() => makeWriteChain(returningQueue)),
      select: jest.fn(() => makeSelectChain(selectQueue.shift() ?? [])),
    },
  };
  let service: WarehouseTransferService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
    jest.spyOn(Math, 'random').mockReturnValue(0.25);
    selectQueue.length = 0;
    returningQueue.length = 0;
    service = new WarehouseTransferService(drizzle as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates valid transfers and rejects invalid source/items', async () => {
    await expect(service.createTransfer('tenant-1', 'user-1', 'wh-1', 'wh-1', [])).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createTransfer('tenant-1', 'user-1', 'wh-1', 'wh-2', [])).rejects.toBeInstanceOf(BadRequestException);

    returningQueue.push([{ id: 'transfer-1', status: 'draft' }]);
    await expect(service.createTransfer('tenant-1', 'user-1', 'wh-1', 'wh-2', [
      { productId: 'product-1', quantity: 2 },
    ], 'Move')).resolves.toEqual({ id: 'transfer-1', status: 'draft' });
    expect(drizzle.db.insert).toHaveBeenCalledTimes(2);
  });

  it('confirms and receives transfers only in valid states', async () => {
    selectQueue.push([], [{ id: 'transfer-1', status: 'received' }], [{ id: 'transfer-1', status: 'draft' }]);
    await expect(service.confirmTransfer('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.confirmTransfer('tenant-1', 'transfer-1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.confirmTransfer('tenant-1', 'transfer-1')).resolves.toMatchObject({ status: 'in_transit' });

    selectQueue.push([], [{ id: 'transfer-1', status: 'draft' }], [{ id: 'transfer-1', status: 'in_transit' }]);
    await expect(service.receiveTransfer('tenant-1', 'missing', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.receiveTransfer('tenant-1', 'transfer-1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.receiveTransfer('tenant-1', 'transfer-1', 'user-1')).resolves.toMatchObject({ status: 'received' });
  });

  it('gets and lists transfers with pagination metadata', async () => {
    selectQueue.push([], [{ id: 'transfer-1' }], [{ id: 'transfer-1' }], [{ count: '1' }]);

    await expect(service.getTransferById('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getTransferById('tenant-1', 'transfer-1')).resolves.toEqual({ id: 'transfer-1' });
    await expect(service.listTransfers('tenant-1', 2, 10)).resolves.toEqual({
      items: [{ id: 'transfer-1' }],
      total: 1,
      page: 2,
      limit: 10,
      totalPages: 1,
    });

    selectQueue.push([], [{ count: '0' }]);
    await expect(service.listTransfers('tenant-1')).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });
});
