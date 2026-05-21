const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  tmsVehicles: { tenantId: 'tmsVehicles.tenantId' },
  tmsTrips: { tenantId: 'tmsTrips.tenantId', driverId: 'tmsTrips.driverId', createdAt: 'tmsTrips.createdAt', id: 'tmsTrips.id' },
  tmsTripStops: { tripId: 'tmsTripStops.tripId', sequence: 'tmsTripStops.sequence', id: 'tmsTripStops.id' },
  orders: { id: 'orders.id' },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  asc: jest.fn((field) => ({ op: 'asc', field })),
}));

import { NotFoundException } from '@nestjs/common';
import { TmsService } from './tms.service';

const selectQueue: any[][] = [];
const returningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
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

describe('TmsService coverage', () => {
  let service: TmsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    service = new TmsService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates trips with optional stops and lists trips/vehicles', async () => {
    returningQueue.push([{ id: 'trip-1', tripNumber: 'TRIP-1' }]);
    await expect(service.createTrip('tenant-1', { tripNumber: 'TRIP-1', driverId: 'driver-1', orderIds: ['o1', 'o2'] })).resolves.toEqual({ id: 'trip-1', tripNumber: 'TRIP-1' });
    expect(mockDb.insert).toHaveBeenCalledTimes(3);

    returningQueue.push([{ id: 'trip-2', tripNumber: 'TRIP-ML4KASQO' }]);
    await expect(service.createTrip('tenant-1', {})).resolves.toEqual({
      id: 'trip-2',
      tripNumber: 'TRIP-ML4KASQO',
    });

    selectQueue.push([{ id: 'trip-1' }], [{ id: 'vehicle-1' }]);
    await expect(service.listTrips('tenant-1', 'driver-1')).resolves.toEqual([{ id: 'trip-1' }]);
    await expect(service.listVehicles('tenant-1')).resolves.toEqual([{ id: 'vehicle-1' }]);
  });

  it('loads trip details and confirms deliveries', async () => {
    selectQueue.push([], [{ id: 'trip-1' }], [{ id: 'stop-1' }]);
    await expect(service.getTripDetails('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getTripDetails('tenant-1', 'trip-1')).resolves.toEqual({ id: 'trip-1', stops: [{ id: 'stop-1' }] });

    returningQueue.push([{ id: 'stop-1', orderId: 'order-1' }], [{ id: 'stop-2', orderId: null }]);
    await expect(service.confirmDelivery('tenant-1', 'stop-1', { podUrl: 'pod', signature: 'sig' })).resolves.toEqual({ id: 'stop-1', orderId: 'order-1' });
    await expect(service.confirmDelivery('tenant-1', 'stop-2', {})).resolves.toEqual({ id: 'stop-2', orderId: null });
    expect(mockDb.update).toHaveBeenCalledTimes(3);
  });
});
