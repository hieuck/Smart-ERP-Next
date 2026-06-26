jest.mock('drizzle-orm', () => ({
  eq: jest.fn((f: any, v: any) => ({ op: 'eq', field: f, value: v })),
  and: jest.fn((...c: any[]) => ({ op: 'and', conditions: c })),
  desc: jest.fn((f: any) => ({ op: 'desc', field: f })),
  sql: jest.fn((strings: TemplateStringsArray) => ({ op: 'sql', strings })),
}));

jest.mock('@smart-erp/database', () => ({
  notifications: {},
  NewNotification: {},
  Notification: {},
}));

import { NotificationsService } from '../notifications/notifications.service';

describe('NotificationsService (integration)', () => {
  let service: NotificationsService;
  let mockDb: { select: jest.Mock; insert: jest.Mock; update: jest.Mock; delete: jest.Mock };

  beforeEach(() => {
    mockDb = { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() };
    const mockDrizzleService = { db: mockDb };
    service = new NotificationsService(mockDrizzleService as any);
  });

  describe('create', () => {
    it('should create and return a notification', async () => {
      const data = { userId: 'u1', type: 'approval', title: 'Test Title', message: 'Test message' };
      const expected = { id: 'n1', tenantId: 't1', ...data, isRead: false, createdAt: new Date() };
      (mockDb.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([expected]),
        }),
      });

      const result = await service.create('t1', data);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  describe('findByUser', () => {
    it('should return notifications with default limit of 50', async () => {
      const rows = [
        { id: 'n1', tenantId: 't1', userId: 'u1', type: 'approval', title: 'A', message: 'M', isRead: false, createdAt: new Date() },
      ];
      const limitMock = jest.fn().mockResolvedValue(rows);
      const orderByMock = jest.fn().mockReturnValue({ limit: limitMock });
      const whereMock = jest.fn().mockReturnValue({ orderBy: orderByMock });
      const fromMock = jest.fn().mockReturnValue({ where: whereMock });
      (mockDb.select as jest.Mock).mockReturnValue({ from: fromMock });

      const result = await service.findByUser('t1', 'u1');

      expect(limitMock).toHaveBeenCalledWith(50);
      expect(result).toEqual(rows);
    });

    it('should return notifications with custom limit', async () => {
      const rows = [
        { id: 'n2', tenantId: 't1', userId: 'u1', type: 'system', title: 'B', message: 'N', isRead: true, createdAt: new Date() },
      ];
      const limitMock = jest.fn().mockResolvedValue(rows);
      const orderByMock = jest.fn().mockReturnValue({ limit: limitMock });
      const whereMock = jest.fn().mockReturnValue({ orderBy: orderByMock });
      const fromMock = jest.fn().mockReturnValue({ where: whereMock });
      (mockDb.select as jest.Mock).mockReturnValue({ from: fromMock });

      const result = await service.findByUser('t1', 'u1', 10);

      expect(limitMock).toHaveBeenCalledWith(10);
      expect(result).toEqual(rows);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const whereMock = jest.fn().mockResolvedValue(undefined);
      const setMock = jest.fn().mockReturnValue({ where: whereMock });
      (mockDb.update as jest.Mock).mockReturnValue({ set: setMock });

      await service.markAsRead('t1', 'n1', 'u1');

      expect(mockDb.update).toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledWith({ isRead: true, readAt: expect.any(Date) });
      expect(whereMock).toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      const whereMock = jest.fn().mockResolvedValue(undefined);
      const setMock = jest.fn().mockReturnValue({ where: whereMock });
      (mockDb.update as jest.Mock).mockReturnValue({ set: setMock });

      await service.markAllAsRead('t1', 'u1');

      expect(mockDb.update).toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledWith({ isRead: true, readAt: expect.any(Date) });
      expect(whereMock).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      const whereMock = jest.fn().mockResolvedValue(undefined);
      (mockDb.delete as jest.Mock).mockReturnValue({ where: whereMock });

      await service.delete('t1', 'n1', 'u1');

      expect(mockDb.delete).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      const whereMock = jest.fn().mockResolvedValue([{ count: 5 }]);
      const fromMock = jest.fn().mockReturnValue({ where: whereMock });
      (mockDb.select as jest.Mock).mockReturnValue({ from: fromMock });

      const result = await service.getUnreadCount('t1', 'u1');

      expect(result).toBe(5);
    });

    it('should return 0 when no unread notifications', async () => {
      const whereMock = jest.fn().mockResolvedValue([{ count: 0 }]);
      const fromMock = jest.fn().mockReturnValue({ where: whereMock });
      (mockDb.select as jest.Mock).mockReturnValue({ from: fromMock });

      const result = await service.getUnreadCount('t1', 'u1');

      expect(result).toBe(0);
    });
  });
});
