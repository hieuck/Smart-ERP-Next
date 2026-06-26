jest.mock('@smart-erp/database', () => ({
  inventoryTransactions: {
    id: 'inventoryTransactions.id',
    tenantId: 'inventoryTransactions.tenantId',
    productId: 'inventoryTransactions.productId',
    type: 'inventoryTransactions.type',
    quantity: 'inventoryTransactions.quantity',
  },
  NewInventoryTransaction: class MockNewInventoryTransaction {},
  warehouseTransfers: {
    id: 'warehouseTransfers.id',
    tenantId: 'warehouseTransfers.tenantId',
    transferCode: 'warehouseTransfers.transferCode',
    fromWarehouseId: 'warehouseTransfers.fromWarehouseId',
    toWarehouseId: 'warehouseTransfers.toWarehouseId',
    status: 'warehouseTransfers.status',
    requestedBy: 'warehouseTransfers.requestedBy',
  },
  NewWarehouseTransfer: class MockNewWarehouseTransfer {},
  warehouseTransferItems: {
    id: 'warehouseTransferItems.id',
    transferId: 'warehouseTransferItems.transferId',
    productId: 'warehouseTransferItems.productId',
    quantityRequested: 'warehouseTransferItems.quantityRequested',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WarehouseTransferService } from '../warehouses/warehouse-transfer.service';

const selectQueue: any[][] = [];
const insertQueue: any[][] = [];
const updateQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    offset: jest.fn(() => chain),
    then: jest.fn((onFulfilled: any, onRejected: any) =>
      Promise.resolve(rows).then(onFulfilled, onRejected),
    ),
  };
  return chain;
};

const makeWriteChain = (queue: any[][] = []) => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(queue.shift() ?? [])),
    then: jest.fn((onFulfilled: any, onRejected: any) =>
      Promise.resolve(undefined).then(onFulfilled, onRejected),
    ),
  };
  return chain;
};

describe('WarehouseTransferService (integration)', () => {
  const mockDb = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  };
  let service: WarehouseTransferService;
  const TENANT_ID = 'tenant-1';
  const USER_ID = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();
    selectQueue.length = 0;
    insertQueue.length = 0;
    updateQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain(insertQueue));
    mockDb.update.mockImplementation(() => makeWriteChain(updateQueue));
    service = new (WarehouseTransferService as any)({ db: mockDb });
  });

  describe('createTransfer', () => {
    it('creates a draft transfer with items', async () => {
      insertQueue.push([{ id: 'trf-1', transferCode: 'TRF-ABC', status: 'draft' }]);

      const result = await service.createTransfer(
        TENANT_ID, USER_ID,
        'from-wh-1', 'to-wh-1',
        [{ productId: 'prod-1', quantity: 10 }],
        'Test transfer',
      );

      expect(result.id).toBe('trf-1');
      expect(result.status).toBe('draft');
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it('creates a transfer without notes', async () => {
      insertQueue.push([{ id: 'trf-2', transferCode: 'TRF-DEF', status: 'draft' }]);

      const result = await service.createTransfer(
        TENANT_ID, USER_ID,
        'from-wh-1', 'to-wh-1',
        [{ productId: 'prod-1', quantity: 5 }],
      );

      expect(result.id).toBe('trf-2');
    });

    it('throws BadRequestException when source and destination are the same', async () => {
      await expect(
        service.createTransfer(TENANT_ID, USER_ID, 'same-wh', 'same-wh', [{ productId: 'p-1', quantity: 1 }]),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when items array is empty', async () => {
      await expect(
        service.createTransfer(TENANT_ID, USER_ID, 'from-wh', 'to-wh', []),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates transfer with multiple items', async () => {
      const chainValues = jest.fn(() => ({ returning: jest.fn(() => Promise.resolve([{ id: 'trf-3' }])) }));
      mockDb.insert.mockReturnValue({ values: chainValues } as any);

      await service.createTransfer(
        TENANT_ID, USER_ID,
        'from-wh', 'to-wh',
        [
          { productId: 'prod-1', quantity: 10 },
          { productId: 'prod-2', quantity: 20 },
          { productId: 'prod-3', quantity: 30 },
        ],
      );

      expect(mockDb.insert).toHaveBeenCalledTimes(2);
      expect(chainValues).toHaveBeenNthCalledWith(2, [
        { transferId: 'trf-3', productId: 'prod-1', quantityRequested: 10 },
        { transferId: 'trf-3', productId: 'prod-2', quantityRequested: 20 },
        { transferId: 'trf-3', productId: 'prod-3', quantityRequested: 30 },
      ]);
    });
  });

  describe('confirmTransfer', () => {
    it('confirms a draft transfer', async () => {
      selectQueue.push([{ id: 'trf-1', status: 'draft' }]);

      const result = await service.confirmTransfer(TENANT_ID, 'trf-1');

      expect(result.status).toBe('in_transit');
    });

    it('throws NotFoundException when transfer does not exist', async () => {
      selectQueue.push([]);

      await expect(service.confirmTransfer(TENANT_ID, 'missing'))
        .rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when transfer is not draft', async () => {
      selectQueue.push([{ id: 'trf-1', status: 'in_transit' }]);

      await expect(service.confirmTransfer(TENANT_ID, 'trf-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when transfer is already received', async () => {
      selectQueue.push([{ id: 'trf-1', status: 'received' }]);

      await expect(service.confirmTransfer(TENANT_ID, 'trf-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when transfer is cancelled', async () => {
      selectQueue.push([{ id: 'trf-1', status: 'cancelled' }]);

      await expect(service.confirmTransfer(TENANT_ID, 'trf-1'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('receiveTransfer', () => {
    it('receives an in-transit transfer', async () => {
      selectQueue.push([{ id: 'trf-1', status: 'in_transit' }]);

      const result = await service.receiveTransfer(TENANT_ID, 'trf-1', USER_ID);

      expect(result.status).toBe('received');
    });

    it('throws NotFoundException when transfer does not exist', async () => {
      selectQueue.push([]);

      await expect(service.receiveTransfer(TENANT_ID, 'missing', USER_ID))
        .rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when transfer is not in_transit', async () => {
      selectQueue.push([{ id: 'trf-1', status: 'draft' }]);

      await expect(service.receiveTransfer(TENANT_ID, 'trf-1', USER_ID))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when transfer is already received', async () => {
      selectQueue.push([{ id: 'trf-1', status: 'received' }]);

      await expect(service.receiveTransfer(TENANT_ID, 'trf-1', USER_ID))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getTransferById', () => {
    it('returns a transfer by id', async () => {
      const transfer: any = {
        id: 'trf-1', tenantId: TENANT_ID, status: 'draft', transferCode: 'TRF-001',
      };
      selectQueue.push([transfer]);

      const result = await service.getTransferById(TENANT_ID, 'trf-1');

      expect(result).toEqual(transfer);
    });

    it('throws NotFoundException when transfer does not exist', async () => {
      selectQueue.push([]);

      await expect(service.getTransferById(TENANT_ID, 'missing'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('listTransfers', () => {
    it('returns paginated transfers list', async () => {
      const items: any[] = [
        { id: 'trf-1', tenantId: TENANT_ID, status: 'draft' },
        { id: 'trf-2', tenantId: TENANT_ID, status: 'in_transit' },
      ];
      selectQueue.push(items, [{ count: 2 }]);

      const result = await service.listTransfers(TENANT_ID);

      expect(result.items).toEqual(items);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('returns empty list when no transfers', async () => {
      selectQueue.push([], [{ count: 0 }]);

      const result = await service.listTransfers(TENANT_ID);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('applies pagination parameters', async () => {
      const items: any[] = [{ id: 'trf-5', tenantId: TENANT_ID }];
      selectQueue.push(items, [{ count: 25 }]);

      const result = await service.listTransfers(TENANT_ID, 2, 10);

      expect(result.items).toEqual(items);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
    });
  });
});
