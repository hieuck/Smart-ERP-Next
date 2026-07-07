jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((f: any, v: any) => ({ op: 'eq', field: f, value: v })),
  and: jest.fn((...c: any[]) => ({ op: 'and', conditions: c })),
  desc: jest.fn((f: any) => ({ op: 'desc', field: f })),
}));

jest.mock('@smart-erp/database', () => ({ db: { select: jest.fn(), insert: jest.fn(), delete: jest.fn() } }));
jest.mock('@smart-erp/database/schema', () => ({ comments: {}, users: {} }));

import { db } from '@smart-erp/database';
import { CommentsService } from '../comments/comments.service';

describe('CommentsService (integration)', () => {
  let service: CommentsService;
  let mockGateway: { broadcastToTenant: jest.Mock };

  const TENANT_ID = 'tenant-1';
  const ORDER_ID = 'order-1';
  const USER_ID = 'user-1';
  const COMMENT_ID = 'comment-1';

  beforeEach(() => {
    mockGateway = { broadcastToTenant: jest.fn() };
    service = new CommentsService(mockGateway as any);
    jest.clearAllMocks();
  });

  describe('getByOrder', () => {
    it('returns comments with user info for an order', async () => {
      const now = new Date();
      const rows = [
        { comments: { id: 'c1', content: 'Hello', createdAt: now, tenantId: TENANT_ID, orderId: ORDER_ID, userId: USER_ID }, users: { id: USER_ID, name: 'Alice' } },
        { comments: { id: 'c2', content: 'World', createdAt: now, tenantId: TENANT_ID, orderId: ORDER_ID, userId: 'u2' }, users: { id: 'u2', name: 'Bob' } },
      ];

      const limitMock = jest.fn().mockResolvedValue(rows);
      const orderByMock = jest.fn().mockReturnValue({ limit: limitMock });
      const whereMock = jest.fn().mockReturnValue({ orderBy: orderByMock });
      const leftJoinMock = jest.fn().mockReturnValue({ where: whereMock });
      const fromMock = jest.fn().mockReturnValue({ leftJoin: leftJoinMock });
      (db.select as jest.Mock).mockReturnValue({ from: fromMock });

      const result = await service.getByOrder(TENANT_ID, ORDER_ID);

      expect(db.select).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'c1', user: { id: USER_ID, name: 'Alice' } });
      expect(result[1]).toMatchObject({ id: 'c2', user: { id: 'u2', name: 'Bob' } });
    });

    it('falls back to "System" when no user is joined', async () => {
      const rows = [
        { id: 'c1', content: 'System comment', tenantId: TENANT_ID, orderId: ORDER_ID, userId: null },
      ];

      const limitMock = jest.fn().mockResolvedValue(rows);
      const orderByMock = jest.fn().mockReturnValue({ limit: limitMock });
      const whereMock = jest.fn().mockReturnValue({ orderBy: orderByMock });
      const leftJoinMock = jest.fn().mockReturnValue({ where: whereMock });
      const fromMock = jest.fn().mockReturnValue({ leftJoin: leftJoinMock });
      (db.select as jest.Mock).mockReturnValue({ from: fromMock });

      const result = await service.getByOrder(TENANT_ID, ORDER_ID);

      expect(result[0].user).toEqual({ name: 'System' });
    });

    it('returns empty array when no comments exist', async () => {
      const limitMock = jest.fn().mockResolvedValue([]);
      const orderByMock = jest.fn().mockReturnValue({ limit: limitMock });
      const whereMock = jest.fn().mockReturnValue({ orderBy: orderByMock });
      const leftJoinMock = jest.fn().mockReturnValue({ where: whereMock });
      const fromMock = jest.fn().mockReturnValue({ leftJoin: leftJoinMock });
      (db.select as jest.Mock).mockReturnValue({ from: fromMock });

      const result = await service.getByOrder(TENANT_ID, ORDER_ID);

      expect(result).toEqual([]);
    });
  });

  describe('add', () => {
    it('inserts a comment and broadcasts notification', async () => {
      const newComment = { id: COMMENT_ID, tenantId: TENANT_ID, orderId: ORDER_ID, userId: USER_ID, content: 'Test', mentions: [], createdAt: new Date() };
      const returningMock = jest.fn().mockResolvedValue([newComment]);
      const valuesMock = jest.fn().mockReturnValue({ returning: returningMock });
      (db.insert as jest.Mock).mockReturnValue({ values: valuesMock });

      const result = await service.add(TENANT_ID, ORDER_ID, USER_ID, 'Test');

      expect(db.insert).toHaveBeenCalled();
      expect(valuesMock).toHaveBeenCalledWith({ tenantId: TENANT_ID, orderId: ORDER_ID, userId: USER_ID, content: 'Test', mentions: [] });
      expect(returningMock).toHaveBeenCalled();
      expect(mockGateway.broadcastToTenant).toHaveBeenCalledWith(TENANT_ID, 'comment.added', { orderId: ORDER_ID, comment: newComment });
      expect(result).toEqual(newComment);
    });

    it('inserts a comment with mentions', async () => {
      const mentions = ['user-2', 'user-3'];
      const newComment = { id: COMMENT_ID, tenantId: TENANT_ID, orderId: ORDER_ID, userId: USER_ID, content: 'Mention', mentions, createdAt: new Date() };
      const returningMock = jest.fn().mockResolvedValue([newComment]);
      const valuesMock = jest.fn().mockReturnValue({ returning: returningMock });
      (db.insert as jest.Mock).mockReturnValue({ values: valuesMock });

      const result = await service.add(TENANT_ID, ORDER_ID, USER_ID, 'Mention', mentions);

      expect(valuesMock).toHaveBeenCalledWith({ tenantId: TENANT_ID, orderId: ORDER_ID, userId: USER_ID, content: 'Mention', mentions });
      expect(result.mentions).toEqual(mentions);
    });
  });

  describe('delete', () => {
    it('deletes a comment when owned by the user', async () => {
      const existing = { id: COMMENT_ID, tenantId: TENANT_ID, userId: USER_ID };
      const whereMock = jest.fn().mockResolvedValue([existing]);
      const fromMock = jest.fn().mockReturnValue({ where: whereMock });
      (db.select as jest.Mock).mockReturnValue({ from: fromMock });

      const deleteWhereMock = jest.fn().mockResolvedValue(undefined);
      (db.delete as jest.Mock).mockReturnValue({ where: deleteWhereMock });

      await service.delete(TENANT_ID, COMMENT_ID, USER_ID);

      expect(db.delete).toHaveBeenCalled();
      expect(deleteWhereMock).toHaveBeenCalled();
    });

    it('throws NotFoundException when comment does not exist', async () => {
      const whereMock = jest.fn().mockResolvedValue([]);
      const fromMock = jest.fn().mockReturnValue({ where: whereMock });
      (db.select as jest.Mock).mockReturnValue({ from: fromMock });

      await expect(service.delete(TENANT_ID, COMMENT_ID, USER_ID))
        .rejects.toThrow('Comment not found');
    });

    it('throws NotFoundException when user does not own the comment', async () => {
      const existing = { id: COMMENT_ID, tenantId: TENANT_ID, userId: 'other-user' };
      const whereMock = jest.fn().mockResolvedValue([existing]);
      const fromMock = jest.fn().mockReturnValue({ where: whereMock });
      (db.select as jest.Mock).mockReturnValue({ from: fromMock });

      await expect(service.delete(TENANT_ID, COMMENT_ID, USER_ID))
        .rejects.toThrow('Not authorized');
    });
  });
});
