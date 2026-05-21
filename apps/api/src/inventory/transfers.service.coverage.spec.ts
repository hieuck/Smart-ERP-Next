const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  warehouseTransfers: {
    id: 'warehouseTransfers.id',
    tenantId: 'warehouseTransfers.tenantId',
    status: 'warehouseTransfers.status',
    createdAt: 'warehouseTransfers.createdAt',
    fromWarehouseId: 'warehouseTransfers.fromWarehouseId',
    toWarehouseId: 'warehouseTransfers.toWarehouseId',
  },
  warehouseTransferItems: {
    id: 'warehouseTransferItems.id',
    transferId: 'warehouseTransferItems.transferId',
  },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from([0xab, 0xcd])),
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransfersService } from './transfers.service';

const selectQueue: any[][] = [];
const returningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
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

describe('TransfersService coverage', () => {
  const activityService = { log: jest.fn() };
  let service: TransfersService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T03:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    activityService.log.mockResolvedValue(undefined);
    service = new TransfersService(activityService as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('creates transfers with generated codes, item rows, and activity logs', async () => {
    await expect(service.create('tenant-1', 'user-1', {
      fromWarehouseId: 'wh-1',
      toWarehouseId: 'wh-1',
      items: [],
    })).rejects.toBeInstanceOf(BadRequestException);

    returningQueue.push([{ id: 'transfer-1', transferCode: 'TRF-TEST', status: 'draft' }]);
    selectQueue.push(
      [{ id: 'transfer-1', transferCode: 'TRF-TEST', status: 'draft' }],
      [{ id: 'item-1', productId: 'product-1' }],
    );

    await expect(service.create('tenant-1', 'user-1', {
      fromWarehouseId: 'wh-1',
      toWarehouseId: 'wh-2',
      notes: 'Move stock',
      items: [
        { productId: 'product-1', lotId: 'lot-1', quantityRequested: 2 },
        { productId: 'product-2', quantityRequested: 1 },
      ],
    })).resolves.toEqual({
      id: 'transfer-1',
      transferCode: 'TRF-TEST',
      status: 'draft',
      items: [{ id: 'item-1', productId: 'product-1' }],
    });

    expect(activityService.log).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
      'created',
      'transfer',
      'transfer-1',
      expect.objectContaining({ itemsCount: 2 }),
    );
    expect(mockDb.insert).toHaveBeenCalledTimes(3);

    returningQueue.push([{ id: 'transfer-2', transferCode: 'TRF-TEST-2', status: 'draft' }]);
    selectQueue.push(
      [{ id: 'transfer-2', transferCode: 'TRF-TEST-2', status: 'draft' }],
      [],
    );
    await expect(service.create('tenant-1', 'user-1', {
      fromWarehouseId: 'wh-1',
      toWarehouseId: 'wh-2',
      items: [],
    })).resolves.toMatchObject({ id: 'transfer-2', items: [] });
  });

  it('finds transfer lists and transfer detail with not-found handling', async () => {
    selectQueue.push([{ id: 'transfer-1', status: 'draft' }]);
    await expect(service.findAll('tenant-1', {
      status: 'draft',
      fromWarehouseId: 'wh-1',
      toWarehouseId: 'wh-2',
    })).resolves.toEqual([{ id: 'transfer-1', status: 'draft' }]);

    selectQueue.push([], [{ id: 'transfer-1', status: 'draft' }], [{ id: 'item-1' }]);
    await expect(service.findOne('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne('tenant-1', 'transfer-1')).resolves.toEqual({
      id: 'transfer-1',
      status: 'draft',
      items: [{ id: 'item-1' }],
    });
  });

  it('approves, ships, receives, and cancels only valid transfer states', async () => {
    jest.spyOn(service, 'findOne')
      .mockResolvedValueOnce({ id: 'transfer-1', status: 'shipped', transferCode: 'TRF-1' } as any)
      .mockResolvedValueOnce({ id: 'transfer-1', status: 'draft', transferCode: 'TRF-1' } as any)
      .mockResolvedValueOnce({ id: 'transfer-1', status: 'draft', transferCode: 'TRF-1' } as any)
      .mockResolvedValueOnce({ id: 'transfer-1', status: 'approved', transferCode: 'TRF-1' } as any)
      .mockResolvedValueOnce({ id: 'transfer-1', status: 'approved', transferCode: 'TRF-1' } as any)
      .mockResolvedValueOnce({ id: 'transfer-1', status: 'shipped', transferCode: 'TRF-1' } as any)
      .mockResolvedValueOnce({ id: 'transfer-1', status: 'received', transferCode: 'TRF-1' } as any)
      .mockResolvedValueOnce({ id: 'transfer-1', status: 'approved', transferCode: 'TRF-1' } as any);

    await expect(service.approve('tenant-1', 'user-1', 'transfer-1')).rejects.toBeInstanceOf(BadRequestException);

    returningQueue.push([{ id: 'transfer-1', status: 'approved' }]);
    await expect(service.approve('tenant-1', 'user-1', 'transfer-1')).resolves.toEqual({
      id: 'transfer-1',
      status: 'approved',
    });

    await expect(service.ship('tenant-1', 'user-1', 'transfer-1', [])).rejects.toBeInstanceOf(BadRequestException);

    returningQueue.push([{ id: 'transfer-1', status: 'shipped' }]);
    await expect(service.ship('tenant-1', 'user-1', 'transfer-1', [
      { itemId: 'item-1', quantityShipped: 2 },
    ])).resolves.toEqual({ id: 'transfer-1', status: 'shipped' });

    await expect(service.receive('tenant-1', 'user-1', 'transfer-1', [])).rejects.toBeInstanceOf(BadRequestException);

    returningQueue.push([{ id: 'transfer-1', status: 'received' }]);
    await expect(service.receive('tenant-1', 'user-1', 'transfer-1', [
      { itemId: 'item-1', quantityReceived: 2 },
    ])).resolves.toEqual({ id: 'transfer-1', status: 'received' });

    await expect(service.cancel('tenant-1', 'user-1', 'transfer-1')).rejects.toBeInstanceOf(BadRequestException);

    returningQueue.push([{ id: 'transfer-1', status: 'cancelled' }]);
    await expect(service.cancel('tenant-1', 'user-1', 'transfer-1')).resolves.toEqual({
      id: 'transfer-1',
      status: 'cancelled',
    });
  });
});
