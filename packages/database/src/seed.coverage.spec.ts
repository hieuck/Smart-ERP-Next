const mockPool = {
  end: jest.fn().mockResolvedValue(undefined),
};

const mockDb = {
  insert: jest.fn(),
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool),
}));

jest.mock('drizzle-orm/node-postgres', () => ({
  drizzle: jest.fn(() => mockDb),
}));

jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hashSync: jest.fn((value: string) => `hash:${value}`),
}), { virtual: true });

jest.mock('./schema', () => ({
  tenants: 'tenants',
  users: 'users',
  warehouses: 'warehouses',
  products: 'products',
  customers: 'customers',
  orders: 'orders',
}));

const makeInsertChain = (returningQueue: any[][]) => {
  const chain: any = {
    values: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
  };
  return chain;
};

describe('database seed coverage', () => {
  const returningQueue: any[][] = [];

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    returningQueue.length = 0;
    mockDb.insert.mockImplementation(() => makeInsertChain(returningQueue));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runs the native database seed script through completion', async () => {
    returningQueue.push(
      [{ id: 'tenant-1' }],
      [{ id: 'admin-1' }, { id: 'user-2' }],
      [{ id: 'wh-1' }, { id: 'wh-2' }],
      [{ id: 'product-1' }],
      [{ id: 'customer-1' }],
      [{ id: 'order-1' }],
    );

    await jest.isolateModulesAsync(async () => {
      await import('./seed');
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDb.insert).toHaveBeenCalledTimes(6);
    const usersInsertCall = mockDb.insert.mock.results[1].value.values.mock.calls[0][0];
    expect(usersInsertCall).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: 'admin@smarterp.vn',
          role: 'admin',
          passwordHash: expect.stringMatching(/^hash:/),
        }),
        expect.objectContaining({
          email: 'admin@demo.smarterp.vn',
          role: 'admin',
          passwordHash: expect.stringMatching(/^hash:/),
        }),
      ]),
    );
    expect(usersInsertCall.some((u: any) => u.passwordHash === 'hash:admin123')).toBe(false);
    expect(usersInsertCall.some((u: any) => u.passwordHash === 'hash:demo123456')).toBe(false);
    expect(mockDb.insert.mock.results[5].value.values.mock.calls[0][0]).toHaveLength(100);
    expect(mockPool.end).toHaveBeenCalled();
  });

  it('logs seed errors and still closes the pool', async () => {
    mockDb.insert.mockImplementationOnce(() => {
      throw new Error('insert failed');
    });

    await jest.isolateModulesAsync(async () => {
      await import('./seed');
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(console.error).toHaveBeenCalledWith('❌ Error during seeding:', expect.any(Error));
    expect(mockPool.end).toHaveBeenCalled();
  });
});
