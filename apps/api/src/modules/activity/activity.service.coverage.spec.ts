import { ActivityService } from './activity.service';

const mockDb = {
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([{ id: 'log-1' }]),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
};

describe('ActivityService', () => {
  let service: ActivityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActivityService({ db: mockDb } as any);
  });

  it('log creates record', async () => {
    const r = await service.log('t1', 'u1', 'created', 'product', 'p1', { name: 'test' });
    expect(r.id).toBe('log-1');
  });

  it('log handles empty userId', async () => {
    const r = await service.log('t1', '', 'updated', 'order', 'o1');
    expect(r).toBeDefined();
  });

  it('findAllPaginated returns paginated result', async () => {
    const sqlFn = jest.fn(() => 'count');
    mockDb.select.mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ count: 5 }]) }) });
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockResolvedValue([{ id: 'log-1' }, { id: 'log-2' }]),
    });
    const r = await service.findAllPaginated('t1', { page: 1, limit: 10 });
    expect(r.items).toHaveLength(2);
    expect(r.total).toBe(5);
    expect(r.page).toBe(1);
  });

  it('findAllPaginated with filters', async () => {
    mockDb.select.mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ count: 1 }]) }) });
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockResolvedValue([{ id: 'log-1' }]),
    });
    const r = await service.findAllPaginated('t1', { entityType: 'order', action: 'created', page: 1, limit: 10 });
    expect(r.items).toHaveLength(1);
  });
});
