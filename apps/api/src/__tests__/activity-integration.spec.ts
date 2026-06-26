jest.mock('drizzle-orm', () => ({
  eq: jest.fn((f: any, v: any) => ({ op: 'eq', field: f, value: v })),
  and: jest.fn((...c: any[]) => ({ op: 'and', conditions: c })),
  desc: jest.fn((f: any) => ({ op: 'desc', field: f })),
  sql: jest.fn((strings: TemplateStringsArray) => ({ op: 'sql', strings })),
  gte: jest.fn((f: any, v: any) => ({ op: 'gte', field: f, value: v })),
  lte: jest.fn((f: any, v: any) => ({ op: 'lte', field: f, value: v })),
}));

jest.mock('@smart-erp/database', () => ({
  activityLogs: {},
  users: {},
}));

import { ActivityService } from '../modules/activity/activity.service';

describe('ActivityService (integration)', () => {
  let service: ActivityService;
  let mockDb: { select: jest.Mock; insert: jest.Mock; update: jest.Mock; delete: jest.Mock };

  beforeEach(() => {
    mockDb = { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() };
    const mockDrizzleService = { db: mockDb };
    service = new ActivityService(mockDrizzleService as any);
  });

  describe('getRecentActivities', () => {
    it('should return recent activities with default limit of 10', async () => {
      const rows = [
        { id: 'a1', tenantId: 't1', userId: 'u1', action: 'login', entityType: 'user', entityId: 'u1', details: null, createdAt: new Date(), user: { id: 'u1', name: 'Test', email: 'test@test.com' } },
      ];
      const limitMock = jest.fn().mockResolvedValue(rows);
      const orderByMock = jest.fn().mockReturnValue({ limit: limitMock });
      const whereMock = jest.fn().mockReturnValue({ orderBy: orderByMock });
      const leftJoinMock = jest.fn().mockReturnValue({ where: whereMock });
      const fromMock = jest.fn().mockReturnValue({ leftJoin: leftJoinMock });
      (mockDb.select as jest.Mock).mockReturnValue({ from: fromMock });

      const result = await service.getRecentActivities('t1');

      expect(limitMock).toHaveBeenCalledWith(10);
      expect(result).toEqual(rows);
    });

    it('should return recent activities with custom limit', async () => {
      const rows = [
        { id: 'a2', tenantId: 't1', userId: 'u2', action: 'create', entityType: 'order', entityId: 'ord-1', details: { status: 'new' }, createdAt: new Date(), user: { id: 'u2', name: 'User 2', email: 'u2@test.com' } },
      ];
      const limitMock = jest.fn().mockResolvedValue(rows);
      const orderByMock = jest.fn().mockReturnValue({ limit: limitMock });
      const whereMock = jest.fn().mockReturnValue({ orderBy: orderByMock });
      const leftJoinMock = jest.fn().mockReturnValue({ where: whereMock });
      const fromMock = jest.fn().mockReturnValue({ leftJoin: leftJoinMock });
      (mockDb.select as jest.Mock).mockReturnValue({ from: fromMock });

      const result = await service.getRecentActivities('t1', 5);

      expect(limitMock).toHaveBeenCalledWith(5);
      expect(result).toEqual(rows);
    });
  });

  describe('log', () => {
    it('should log an activity with details', async () => {
      const expected = { id: 'a1', tenantId: 't1', userId: 'u1', action: 'create', entityType: 'order', entityId: 'ord-1', details: { status: 'new' }, createdAt: new Date() };
      (mockDb.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([expected]),
        }),
      });

      const result = await service.log('t1', 'u1', 'create', 'order', 'ord-1', { status: 'new' });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });

    it('should log an activity without details', async () => {
      const expected = { id: 'a2', tenantId: 't1', userId: 'u1', action: 'delete', entityType: 'product', entityId: 'prod-1', details: null, createdAt: new Date() };
      (mockDb.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([expected]),
        }),
      });

      const result = await service.log('t1', 'u1', 'delete', 'product', 'prod-1');

      expect(result).toEqual(expected);
    });
  });

  describe('findAllPaginated', () => {
    const defaultQuery = { page: 1, limit: 10 };

    it('should return paginated results with items and metadata', async () => {
      const items = [
        { id: 'a1', tenantId: 't1', userId: 'u1', action: 'login', entityType: 'user', entityId: 'u1', details: null, createdAt: new Date(), user: { id: 'u1', name: 'T', email: 't@t.com' } },
      ];
      const countWhereMock = jest.fn().mockResolvedValue([{ count: 1 }]);
      const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });

      const offsetMock = jest.fn().mockResolvedValue(items);
      const limitMock = jest.fn().mockReturnValue({ offset: offsetMock });
      const orderByMock = jest.fn().mockReturnValue({ limit: limitMock });
      const whereMock = jest.fn().mockReturnValue({ orderBy: orderByMock });
      const leftJoinMock = jest.fn().mockReturnValue({ where: whereMock });
      const fromMock = jest.fn().mockReturnValue({ leftJoin: leftJoinMock });

      (mockDb.select as jest.Mock)
        .mockReturnValueOnce({ from: countFromMock })
        .mockReturnValueOnce({ from: fromMock });

      const result = await service.findAllPaginated('t1', defaultQuery);

      expect(mockDb.select).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ items, total: 1, page: 1, limit: 10, totalPages: 1 });
    });

    it('should apply entityType filter', async () => {
      const items = [
        { id: 'a2', tenantId: 't1', userId: 'u1', action: 'update', entityType: 'order', entityId: 'ord-1', details: null, createdAt: new Date(), user: null },
      ];
      const countWhereMock = jest.fn().mockResolvedValue([{ count: 1 }]);
      const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });

      const offsetMock = jest.fn().mockResolvedValue(items);
      const limitMock = jest.fn().mockReturnValue({ offset: offsetMock });
      const orderByMock = jest.fn().mockReturnValue({ limit: limitMock });
      const whereMock = jest.fn().mockReturnValue({ orderBy: orderByMock });
      const leftJoinMock = jest.fn().mockReturnValue({ where: whereMock });
      const fromMock = jest.fn().mockReturnValue({ leftJoin: leftJoinMock });

      (mockDb.select as jest.Mock)
        .mockReturnValueOnce({ from: countFromMock })
        .mockReturnValueOnce({ from: fromMock });

      const result = await service.findAllPaginated('t1', { ...defaultQuery, entityType: 'order' });

      expect(result.total).toBe(1);
      expect(result.items).toEqual(items);
    });

    it('should apply multiple filters', async () => {
      const countWhereMock = jest.fn().mockResolvedValue([{ count: 0 }]);
      const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });

      const offsetMock = jest.fn().mockResolvedValue([]);
      const limitMock = jest.fn().mockReturnValue({ offset: offsetMock });
      const orderByMock = jest.fn().mockReturnValue({ limit: limitMock });
      const whereMock = jest.fn().mockReturnValue({ orderBy: orderByMock });
      const leftJoinMock = jest.fn().mockReturnValue({ where: whereMock });
      const fromMock = jest.fn().mockReturnValue({ leftJoin: leftJoinMock });

      (mockDb.select as jest.Mock)
        .mockReturnValueOnce({ from: countFromMock })
        .mockReturnValueOnce({ from: fromMock });

      const result = await service.findAllPaginated('t1', { page: 1, limit: 10, entityType: 'product', action: 'delete', userId: 'u1', fromDate: '2026-01-01', toDate: '2026-12-31' });

      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });

    it('should handle empty results', async () => {
      const countWhereMock = jest.fn().mockResolvedValue([{ count: 0 }]);
      const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });

      const offsetMock = jest.fn().mockResolvedValue([]);
      const limitMock = jest.fn().mockReturnValue({ offset: offsetMock });
      const orderByMock = jest.fn().mockReturnValue({ limit: limitMock });
      const whereMock = jest.fn().mockReturnValue({ orderBy: orderByMock });
      const leftJoinMock = jest.fn().mockReturnValue({ where: whereMock });
      const fromMock = jest.fn().mockReturnValue({ leftJoin: leftJoinMock });

      (mockDb.select as jest.Mock)
        .mockReturnValueOnce({ from: countFromMock })
        .mockReturnValueOnce({ from: fromMock });

      const result = await service.findAllPaginated('t1', defaultQuery);

      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 });
    });
  });
});
