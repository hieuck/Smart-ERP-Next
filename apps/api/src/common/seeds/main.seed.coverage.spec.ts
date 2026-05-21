const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient),
  end: jest.fn().mockResolvedValue(undefined),
};

const mockDb = {
  insert: jest.fn(),
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool),
}));

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  tenants: 'tenants',
  users: 'users',
  products: 'products',
  warehouses: 'warehouses',
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn((value: string) => Promise.resolve(`hash:${value}`)),
}));

const makeInsertChain = (returningQueue: any[][]) => {
  const chain: any = {
    values: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('golden seed coverage', () => {
  const returningQueue: any[][] = [];

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    returningQueue.length = 0;
    mockDb.insert.mockImplementation(() => makeInsertChain(returningQueue));
    mockPool.connect.mockResolvedValue(mockClient);
    mockPool.end.mockResolvedValue(undefined);
    mockClient.query.mockImplementation((rawSql: string) => {
      if (rawSql.includes('SELECT id FROM customers')) return Promise.resolve({ rows: [{ id: 'customer-1' }, { id: 'customer-2' }] });
      if (rawSql.includes('INSERT INTO orders')) return Promise.resolve({ rows: [{ id: 'order-1', code: 'SO-1' }, { id: 'order-2', code: 'SO-2' }] });
      if (rawSql.includes('SELECT id FROM suppliers')) return Promise.resolve({ rows: [{ id: 'supplier-1' }] });
      if (rawSql.includes('INSERT INTO purchase_orders')) return Promise.resolve({ rows: [{ id: 'po-1', code: 'PO-1' }] });
      if (rawSql.includes('SELECT id FROM products')) return Promise.resolve({ rows: [{ id: 'product-1' }, { id: 'product-2' }] });
      return Promise.resolve({ rows: [] });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runs the golden seed script without touching a real database', async () => {
    returningQueue.push(
      [{ id: 'tenant-1' }],
      [{ id: 'admin-1' }],
      [{ id: 'manager-1' }],
      [{ id: 'staff-1' }],
      [{ id: 'wh-1' }],
    );

    await jest.isolateModulesAsync(async () => {
      await import('./main.seed');
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDb.insert).toHaveBeenCalledWith('tenants');
    expect(mockDb.insert.mock.results[1].value.values).toHaveBeenCalledWith(expect.objectContaining({
      email: 'admin@demo.vn',
      passwordHash: 'hash:admin123',
    }));
    const productSeed = mockDb.insert.mock.results
      .map((result) => result.value.values.mock.calls[0]?.[0])
      .find((value) => Array.isArray(value) && value.length === 6);
    expect(productSeed).toEqual(expect.arrayContaining([
      expect.objectContaining({ sku: 'IP15-PM-256' }),
      expect.objectContaining({ sku: 'MBP-M3-14' }),
    ]));
    expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO customers'));
    expect(mockPool.end).toHaveBeenCalled();
  });

  it('releases raw SQL clients even when the query fails and reports fatal seed errors', async () => {
    returningQueue.push(
      [{ id: 'tenant-1' }],
      [{ id: 'admin-1' }],
      [{ id: 'manager-1' }],
      [{ id: 'staff-1' }],
      [{ id: 'wh-1' }],
    );
    mockClient.query.mockRejectedValueOnce(new Error('sql failed'));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as any);

    await jest.isolateModulesAsync(async () => {
      await import('./main.seed');
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockClient.release).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('❌ Seed failed:', expect.any(Error));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
