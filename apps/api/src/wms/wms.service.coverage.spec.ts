const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  warehouseLocations: { tenantId: 'warehouseLocations.tenantId', type: 'warehouseLocations.type', id: 'warehouseLocations.id', code: 'warehouseLocations.code' },
  warehouseTasks: { tenantId: 'warehouseTasks.tenantId', type: 'warehouseTasks.type', createdAt: 'warehouseTasks.createdAt', id: 'warehouseTasks.id' },
  warehouseTaskItems: { id: 'warehouseTaskItems.id', productId: 'warehouseTaskItems.productId', quantity: 'warehouseTaskItems.quantity', fromLocationId: 'warehouseTaskItems.fromLocationId', pickedQuantity: 'warehouseTaskItems.pickedQuantity', taskId: 'warehouseTaskItems.taskId' },
  products: { id: 'products.id', name: 'products.name' },
  tmsTrips: {},
  tmsTripStops: {},
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { NotFoundException } from '@nestjs/common';
import { WmsService } from './wms.service';

const selectQueue: any[][] = [];
const returningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    innerJoin: jest.fn(() => chain),
    leftJoin: jest.fn(() => chain),
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

describe('WmsService coverage', () => {
  let service: WmsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    service = new WmsService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates picking tasks and assigns best available locations', async () => {
    returningQueue.push([{ id: 'task-1' }]);
    selectQueue.push([{ id: 'loc-1' }], []);

    await expect(service.createPickingTask('tenant-1', {
      orderId: 'order-1',
      items: [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 1 },
      ],
    })).resolves.toEqual({ id: 'task-1' });

    expect(mockDb.insert).toHaveBeenCalledTimes(3);
    expect(mockDb.insert.mock.results[1].value.values).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'task-1',
      fromLocationId: 'loc-1',
    }));
    expect(mockDb.insert.mock.results[2].value.values).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'task-1',
      fromLocationId: null,
    }));
  });

  it('lists tasks and loads task details with not-found handling', async () => {
    selectQueue.push([{ id: 'task-1' }], [], [{ id: 'task-1', status: 'pending' }], [{ id: 'item-1', productName: 'Coffee' }]);

    await expect(service.listTasks('tenant-1', 'pick')).resolves.toEqual([{ id: 'task-1' }]);
    await expect(service.getTaskDetails('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getTaskDetails('tenant-1', 'task-1')).resolves.toEqual({
      id: 'task-1',
      status: 'pending',
      items: [{ id: 'item-1', productName: 'Coffee' }],
    });
  });

  it('confirms picked quantities and auto-dispatches sales order tasks', async () => {
    returningQueue.push(
      [{ id: 'item-1', pickedQuantity: '2' }],
      [{ id: 'task-1', referenceType: 'sale_order', referenceId: 'order-12345678' }],
      [{ id: 'trip-1' }],
      [{ id: 'task-2', referenceType: 'cycle_count', referenceId: null }],
    );

    await expect(service.confirmPick('tenant-1', 'item-1', 2)).resolves.toEqual([{ id: 'item-1', pickedQuantity: '2' }]);
    await expect(service.completeTaskAndDispatch('tenant-1', 'task-1')).resolves.toEqual({
      task: { id: 'task-1', referenceType: 'sale_order', referenceId: 'order-12345678' },
      trip: { id: 'trip-1' },
    });
    await expect(service.completeTaskAndDispatch('tenant-1', 'task-2')).resolves.toEqual({
      task: { id: 'task-2', referenceType: 'cycle_count', referenceId: null },
    });
  });
});
