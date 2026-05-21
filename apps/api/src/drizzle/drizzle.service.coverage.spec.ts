const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  tenants: 'tenants',
  users: 'users',
  warehouses: 'warehouses',
  products: 'products',
  customers: 'customers',
  orders: 'orders',
}));

jest.mock('drizzle-orm', () => ({
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn((value: string) => Promise.resolve(`hash:${value}`)),
}));

import { Logger } from '@nestjs/common';
import { DrizzleService } from './drizzle.service';

const returningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => ({
  from: jest.fn(() => Promise.resolve(rows)),
});

const makeInsertChain = () => {
  const chain: any = {
    values: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
  };
  return chain;
};

describe('DrizzleService coverage', () => {
  let service: DrizzleService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    returningQueue.length = 0;
    mockDb.select.mockReset();
    mockDb.insert.mockImplementation(() => makeInsertChain());
    service = new DrizzleService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('skips auto-seed when tenant data already exists', async () => {
    mockDb.select.mockReturnValueOnce(makeSelectChain([{ count: 1 }]));
    const seedSpy = jest.spyOn(service as any, 'runAutoSeed').mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(seedSpy).not.toHaveBeenCalled();
  });

  it('runs auto-seed when the database is empty and logs check errors', async () => {
    mockDb.select
      .mockReturnValueOnce(makeSelectChain([{ count: 0 }]))
      .mockImplementationOnce(() => {
        throw new Error('db down');
      });
    const seedSpy = jest.spyOn(service as any, 'runAutoSeed').mockResolvedValue(undefined);

    await service.onModuleInit();
    expect(seedSpy).toHaveBeenCalledTimes(1);

    await service.onModuleInit();
    expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to check or seed database: db down');
  });

  it('auto-seeds demo tenant, users, warehouses, products, customers, and orders', async () => {
    returningQueue.push(
      [{ id: 'tenant-1' }],
      [{ id: 'admin-1' }, { id: 'user-2' }],
      [{ id: 'wh-1' }, { id: 'wh-2' }],
      [{ id: 'product-1' }],
      [{ id: 'customer-1' }],
      [{ id: 'order-1' }],
    );

    await (service as any).runAutoSeed();

    expect(mockDb.insert).toHaveBeenCalledTimes(6);
    expect(mockDb.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Smart ERP Corp',
    }));
    expect(mockDb.insert.mock.results[1].value.values).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ email: 'admin@smarterp.vn', passwordHash: 'hash:admin123' }),
      expect.objectContaining({ email: 'admin@demo.smarterp.vn', passwordHash: 'hash:demo123456' }),
    ]));
    expect(mockDb.insert.mock.results[5].value.values.mock.calls[0][0]).toHaveLength(100);
  });

  it('logs auto-seed failures without throwing', async () => {
    mockDb.insert.mockImplementationOnce(() => {
      throw new Error('insert failed');
    });

    await expect((service as any).runAutoSeed()).resolves.toBeUndefined();
    expect(Logger.prototype.error).toHaveBeenCalledWith('Error during auto-seed: insert failed');
  });
});
