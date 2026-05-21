const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  fixedAssets: {
    tenantId: 'fixedAssets.tenantId',
    id: 'fixedAssets.id',
    category: 'fixedAssets.category',
    status: 'fixedAssets.status',
    createdAt: 'fixedAssets.createdAt',
    lastDepreciationDate: 'fixedAssets.lastDepreciationDate',
    updatedAt: 'fixedAssets.updatedAt',
  },
  fixedAssetDepreciationLogs: {},
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  lt: jest.fn((field, value) => ({ op: 'lt', field, value })),
  or: jest.fn((...conditions) => ({ op: 'or', conditions })),
  isNull: jest.fn((field) => ({ op: 'isNull', field })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { NotFoundException } from '@nestjs/common';
import { FixedAssetsService } from './fixed-assets.service';

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

describe('FixedAssetsService coverage', () => {
  let service: FixedAssetsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    service = new FixedAssetsService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates and lists fixed assets with optional filters', async () => {
    returningQueue.push([{ id: 'asset-1', name: 'Laptop', tenantId: 'tenant-1' }]);
    await expect(service.create('tenant-1', { name: 'Laptop' })).resolves.toEqual({
      id: 'asset-1',
      name: 'Laptop',
      tenantId: 'tenant-1',
    });

    selectQueue.push([{ id: 'asset-1', category: 'IT', status: 'active' }]);
    await expect(service.findAll('tenant-1', { page: 2, limit: 10, category: 'IT', status: 'active' })).resolves.toEqual({
      items: [{ id: 'asset-1', category: 'IT', status: 'active' }],
      page: 2,
      limit: 10,
    });

    selectQueue.push([]);
    await expect(service.findAll('tenant-1', {} as any)).resolves.toEqual({
      items: [],
      page: 1,
      limit: 20,
    });
  });

  it('finds and disposes assets with not-found handling', async () => {
    selectQueue.push([], [{ id: 'asset-1', status: 'active' }]);
    await expect(service.findOne('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne('tenant-1', 'asset-1')).resolves.toEqual({ id: 'asset-1', status: 'active' });

    returningQueue.push([], [{ id: 'asset-1', status: 'disposed' }]);
    await expect(service.dispose('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.dispose('tenant-1', 'asset-1')).resolves.toEqual({ id: 'asset-1', status: 'disposed' });
  });

  it('runs monthly depreciation and skips invalid useful life assets', async () => {
    selectQueue.push([
      {
        id: 'asset-1',
        purchaseCost: '1200',
        residualValue: '0',
        usefulLifeMonths: 12,
        accumulatedDepreciation: '100',
      },
      {
        id: 'asset-2',
        purchaseCost: '500',
        residualValue: '100',
        usefulLifeMonths: 0,
        accumulatedDepreciation: '0',
      },
    ]);
    returningQueue.push([{ id: 'log-1', amount: '100' }]);

    await expect(service.runMonthlyDepreciation('tenant-1')).resolves.toEqual({
      processed: 1,
      logs: [{ id: 'log-1', amount: '100' }],
    });

    const updateChain = mockDb.update.mock.results[0].value;
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({
      accumulatedDepreciation: '200',
      lastDepreciationDate: new Date('2026-05-21T00:00:00.000Z'),
    }));
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });
});
