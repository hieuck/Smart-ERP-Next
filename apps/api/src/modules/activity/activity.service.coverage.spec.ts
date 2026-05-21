jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  gte: jest.fn((field, value) => ({ op: 'gte', field, value })),
  lte: jest.fn((field, value) => ({ op: 'lte', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { ActivityService } from './activity.service';

const makeSelectChain = (terminal: 'limit' | 'offset', rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    leftJoin: jest.fn(() => chain),
    limit: jest.fn(() => (terminal === 'limit' ? Promise.resolve(rows) : chain)),
    offset: jest.fn(() => Promise.resolve(rows)),
    orderBy: jest.fn(() => chain),
    where: jest.fn(() => chain),
  };
  return chain;
};

const makeInsertChain = (rows: any[]) => {
  const chain: any = {
    returning: jest.fn(() => Promise.resolve(rows)),
    values: jest.fn(() => chain),
  };
  return chain;
};

describe('ActivityService coverage', () => {
  const db = {
    insert: jest.fn(),
    select: jest.fn(),
  };
  let service: ActivityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActivityService({ db } as any);
  });

  it('loads recent activities with user details and default limit', async () => {
    const rows = [{ id: 'activity-1', action: 'created' }];
    const selectChain = makeSelectChain('limit', rows);
    db.select.mockReturnValueOnce(selectChain);

    await expect(service.getRecentActivities('tenant-1')).resolves.toEqual(rows);

    expect(selectChain.leftJoin).toHaveBeenCalled();
    expect(selectChain.limit).toHaveBeenCalledWith(10);
  });

  it('returns filtered paginated activities with total pages', async () => {
    const countChain = {
      from: jest.fn(() => countChain),
      where: jest.fn(() => Promise.resolve([{ count: '21' }])),
    };
    const rows = [{ id: 'activity-2', action: 'updated' }];
    const pageChain = makeSelectChain('offset', rows);
    db.select.mockReturnValueOnce(countChain).mockReturnValueOnce(pageChain);

    await expect(
      service.findAllPaginated('tenant-1', {
        action: 'updated',
        entityType: 'product',
        fromDate: '2026-05-01',
        limit: 10,
        page: 3,
        toDate: '2026-05-21',
        userId: 'user-1',
      } as any),
    ).resolves.toEqual({
      items: rows,
      limit: 10,
      page: 3,
      total: 21,
      totalPages: 3,
    });

    expect(pageChain.limit).toHaveBeenCalledWith(10);
    expect(pageChain.offset).toHaveBeenCalledWith(20);
  });

  it('uses defaults for empty paginated activity queries', async () => {
    const countChain = {
      from: jest.fn(() => countChain),
      where: jest.fn(() => Promise.resolve([])),
    };
    const pageChain = makeSelectChain('offset', []);
    db.select.mockReturnValueOnce(countChain).mockReturnValueOnce(pageChain);

    await expect(service.findAllPaginated('tenant-1', {} as any)).resolves.toEqual({
      items: [],
      limit: 10,
      page: 1,
      total: 0,
      totalPages: 0,
    });
  });

  it('logs activity records and returns inserted rows', async () => {
    const insertChain = makeInsertChain([{ id: 'activity-3' }]);
    db.insert.mockReturnValueOnce(insertChain);

    await expect(
      service.log('tenant-1', 'user-1', 'created', 'product', 'product-1', { name: 'Coffee' }),
    ).resolves.toEqual({ id: 'activity-3' });

    expect(insertChain.values).toHaveBeenCalledWith({
      action: 'created',
      details: { name: 'Coffee' },
      entityId: 'product-1',
      entityType: 'product',
      tenantId: 'tenant-1',
      userId: 'user-1',
    });
  });
});
