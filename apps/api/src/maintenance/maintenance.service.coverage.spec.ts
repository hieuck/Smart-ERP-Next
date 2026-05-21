const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  maintenanceOrders: { id: 'maintenanceOrders.id', orderNumber: 'maintenanceOrders.orderNumber', title: 'maintenanceOrders.title', status: 'maintenanceOrders.status', type: 'maintenanceOrders.type', assetId: 'maintenanceOrders.assetId', tenantId: 'maintenanceOrders.tenantId', createdAt: 'maintenanceOrders.createdAt' },
  maintenanceSchedules: { tenantId: 'maintenanceSchedules.tenantId', isActive: 'maintenanceSchedules.isActive', nextMaintenanceDate: 'maintenanceSchedules.nextMaintenanceDate', id: 'maintenanceSchedules.id' },
  fixedAssets: { id: 'fixedAssets.id', name: 'fixedAssets.name' },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  lte: jest.fn((field, value) => ({ op: 'lte', field, value })),
}));

import { MaintenanceService } from './maintenance.service';

const selectQueue: any[][] = [];
const returningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    innerJoin: jest.fn(() => chain),
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

describe('MaintenanceService coverage', () => {
  let service: MaintenanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    service = new MaintenanceService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('processes due schedules for day, week, and month frequencies', async () => {
    selectQueue.push([
      { id: 'schedule-1', assetId: 'asset-1', name: 'Daily', frequencyUnit: 'days', frequencyInterval: 1 },
      { id: 'schedule-2', assetId: 'asset-2', name: 'Weekly', frequencyUnit: 'weeks', frequencyInterval: 2 },
      { id: 'schedule-3', assetId: 'asset-3', name: 'Monthly', frequencyUnit: 'months', frequencyInterval: 1 },
    ]);
    returningQueue.push([{ id: 'order-1' }], [{ id: 'order-2' }], [{ id: 'order-3' }]);

    await expect(service.processDueSchedules('tenant-1')).resolves.toEqual([
      { id: 'order-1' },
      { id: 'order-2' },
      { id: 'order-3' },
    ]);
    expect(mockDb.update).toHaveBeenCalledTimes(3);
  });

  it('creates corrective requests and lists maintenance orders', async () => {
    returningQueue.push([{ id: 'order-1', orderNumber: 'CM-TEST' }]);
    await expect(service.createMaintenanceRequest('tenant-1', { assetId: 'asset-1', title: 'Fix' })).resolves.toEqual({ id: 'order-1', orderNumber: 'CM-TEST' });
    expect(mockDb.update).toHaveBeenCalledTimes(1);

    selectQueue.push([{ id: 'order-1', assetName: 'Machine' }]);
    await expect(service.listOrders('tenant-1')).resolves.toEqual([{ id: 'order-1', assetName: 'Machine' }]);
  });
});
