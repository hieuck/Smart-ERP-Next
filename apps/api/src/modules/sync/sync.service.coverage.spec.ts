jest.mock('@smart-erp/database', () => ({
  syncMetadata: {
    tenantId: 'syncMetadata.tenantId',
    clientId: 'syncMetadata.clientId',
    id: 'syncMetadata.id',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: Object.assign(
    jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
    { raw: jest.fn((value) => ({ op: 'raw', value })) },
  ),
}));

import { SyncService } from './sync.service';

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeWriteChain = () => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => Promise.resolve(undefined)),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('module SyncService coverage', () => {
  const selectQueue: any[][] = [];
  const db = {
    select: jest.fn(() => makeSelectChain(selectQueue.shift() ?? [])),
    insert: jest.fn(() => makeWriteChain()),
    update: jest.fn(() => makeWriteChain()),
  };
  let service: SyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
    selectQueue.length = 0;
    service = new SyncService(db as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gets and upserts sync metadata records', async () => {
    selectQueue.push([{ id: 'meta-1', vectorClock: { products: 1 } }], [{ id: 'meta-1' }], []);

    await expect(service.getMetadata('tenant-1', 'client-1')).resolves.toEqual({ id: 'meta-1', vectorClock: { products: 1 } });
    await expect(service.updateMetadata('tenant-1', 'client-1', { products: 2 })).resolves.toBeUndefined();
    await expect(service.updateMetadata('tenant-1', 'client-2', { products: 1 })).resolves.toBeUndefined();

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('pulls full and delta table snapshots and records the new vector clock', async () => {
    selectQueue.push(
      [{ id: 'product-1' }],
      [{ id: 'order-1' }],
      [{ id: 'customer-1' }],
      [{ id: 'supplier-1' }],
      [{ id: 'tx-1' }],
      [],
    );

    await expect(service.pull('tenant-1', 'client-1', { orders: 1000 })).resolves.toEqual({
      changes: {
        products: [{ id: 'product-1' }],
        orders: [{ id: 'order-1' }],
        customers: [{ id: 'customer-1' }],
        suppliers: [{ id: 'supplier-1' }],
        inventory_transactions: [{ id: 'tx-1' }],
      },
      vectorClock: {
        products: 1770000000000,
        orders: 1770000000000,
        customers: 1770000000000,
        suppliers: 1770000000000,
        inventory_transactions: 1770000000000,
      },
    });
  });

  it('accepts pushed changes after metadata update', async () => {
    selectQueue.push([]);

    await expect(service.push('tenant-1', 'client-1', { products: [] })).resolves.toEqual({ accepted: true });
  });
});
