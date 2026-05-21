const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  loyaltyCards: { tenantId: 'loyaltyCards.tenantId', customerId: 'loyaltyCards.customerId', id: 'loyaltyCards.id' },
  loyaltyRewards: { tenantId: 'loyaltyRewards.tenantId', isActive: 'loyaltyRewards.isActive' },
  loyaltyTransactions: { loyaltyCardId: 'loyaltyTransactions.loyaltyCardId', createdAt: 'loyaltyTransactions.createdAt' },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { NotFoundException } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';

const selectQueue: any[][] = [];
const returningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    offset: jest.fn(() => chain),
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

describe('LoyaltyService coverage', () => {
  let service: LoyaltyService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    service = new LoyaltyService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates cards only once and loads existing cards', async () => {
    selectQueue.push([{ id: 'card-existing' }]);
    await expect(service.createLoyaltyCard('tenant-1', 1)).rejects.toThrow('Customer already has a loyalty card');

    selectQueue.push([]);
    returningQueue.push([{ id: 'card-1', points: 0, tier: 'bronze' }]);
    await expect(service.createLoyaltyCard('tenant-1', 1)).resolves.toEqual({ id: 'card-1', points: 0, tier: 'bronze' });

    selectQueue.push([], [{ id: 'card-1', points: 20 }]);
    await expect(service.getLoyaltyCard('tenant-1', 2)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getLoyaltyCard('tenant-1', 1)).resolves.toEqual({ id: 'card-1', points: 20 });
  });

  it('earns and redeems points with transaction rows', async () => {
    selectQueue.push([{ id: 'card-1', points: 20 }]);
    returningQueue.push([{ id: 'card-1', points: 35 }]);
    await expect(service.earnPoints('tenant-1', 1, 15, 'order-1', 'Order reward')).resolves.toEqual({ id: 'card-1', points: 35 });

    selectQueue.push([{ id: 'card-1', points: 10 }]);
    await expect(service.redeemPoints('tenant-1', 1, 15, 'order-2', 'Redeem')).rejects.toThrow('Insufficient points');

    selectQueue.push([{ id: 'card-1', points: 30 }]);
    returningQueue.push([{ id: 'card-1', points: 10 }]);
    await expect(service.redeemPoints('tenant-1', 1, 20, 'order-3', 'Redeem')).resolves.toEqual({ id: 'card-1', points: 10 });
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });

  it('lists active rewards and paginates transaction history', async () => {
    selectQueue.push([{ id: 'reward-1' }], [{ id: 'card-1' }], [{ count: 2 }], [{ id: 'tx-1' }, { id: 'tx-2' }]);

    await expect(service.getRewards('tenant-1')).resolves.toEqual([{ id: 'reward-1' }]);
    await expect(service.getTransactionHistory('tenant-1', 1, { page: 2, limit: 10 })).resolves.toEqual({
      items: [{ id: 'tx-1' }, { id: 'tx-2' }],
      total: 2,
      page: 2,
      limit: 10,
      totalPages: 1,
    });

    selectQueue.push([{ id: 'card-1' }], [{ count: 0 }], []);
    await expect(service.getTransactionHistory('tenant-1', 1, {} as any)).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });
});
