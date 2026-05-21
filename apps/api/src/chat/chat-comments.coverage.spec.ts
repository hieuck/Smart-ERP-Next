const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  comments: {
    id: 'comments.id',
    tenantId: 'comments.tenantId',
    orderId: 'comments.orderId',
    userId: 'comments.userId',
    createdAt: 'comments.createdAt',
  },
  users: { id: 'users.id' },
  messages: {
    id: 'messages.id',
    tenantId: 'messages.tenantId',
    fromUserId: 'messages.fromUserId',
    toUserId: 'messages.toUserId',
    sentAt: 'messages.sentAt',
    isRead: 'messages.isRead',
  },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  or: jest.fn((...conditions) => ({ op: 'or', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CommentsService } from '../comments/comments.service';

const selectQueue: any[][] = [];
const insertReturningQueue: any[][] = [];
const updateReturningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    leftJoin: jest.fn(() => Promise.resolve(rows)),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeWriteChain = (queue: any[][]) => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(queue.shift() ?? [])),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('chat and comment services coverage', () => {
  const gateway = {
    broadcastToTenant: jest.fn(),
    sendToUser: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    selectQueue.length = 0;
    insertReturningQueue.length = 0;
    updateReturningQueue.length = 0;

    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain(insertReturningQueue));
    mockDb.update.mockImplementation(() => makeWriteChain(updateReturningQueue));
    mockDb.delete.mockImplementation(() => makeWriteChain([]));
  });

  it('adds, lists, and deletes order comments with tenant broadcasts', async () => {
    const service = new CommentsService(gateway as any);
    insertReturningQueue.push([{ id: 'comment-1', content: 'Check payment' }]);
    selectQueue.push([{ id: 'comment-1', userId: 'user-1' }], [{ id: 'comment-2', userId: 'other-user' }], []);

    await expect(service.add('tenant-1', 'order-1', 'user-1', 'Check payment', ['user-2'])).resolves.toEqual({
      id: 'comment-1',
      content: 'Check payment',
    });
    expect(gateway.broadcastToTenant).toHaveBeenCalledWith(
      'tenant-1',
      'comment.added',
      expect.objectContaining({ orderId: 'order-1' }),
    );

    insertReturningQueue.push([{ id: 'comment-default', content: 'No mentions' }]);
    await expect(service.add('tenant-1', 'order-1', 'user-1', 'No mentions')).resolves.toEqual({
      id: 'comment-default',
      content: 'No mentions',
    });

    selectQueue.unshift([{ id: 'comment-1' }]);
    await expect(service.getByOrder('tenant-1', 'order-1')).resolves.toEqual([{ id: 'comment-1' }]);

    await expect(service.delete('tenant-1', 'comment-1', 'user-1')).resolves.toBeUndefined();
    await expect(service.delete('tenant-1', 'comment-2', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.delete('tenant-1', 'missing', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sends messages, mention notifications, conversations, read state, and unread counts', async () => {
    const service = new ChatService(gateway as any);
    const sentAt = new Date('2026-05-20T00:00:00.000Z');
    insertReturningQueue.push([{ id: 'message-1', sentAt }], [{ id: 'message-2', sentAt }]);
    selectQueue.push(
      [{ id: 'newer' }, { id: 'older' }],
      [{ count: 3 }],
      [],
    );
    updateReturningQueue.push([{ id: 'message-1', isRead: 'true' }], []);

    await expect(
      service.sendMessage('tenant-1', 'user-1', 'user-2', 'Hello', ['user-3']),
    ).resolves.toEqual({ id: 'message-1', sentAt });
    expect(gateway.sendToUser).toHaveBeenCalledWith('user-2', 'chat.message', expect.objectContaining({ id: 'message-1' }));
    expect(gateway.sendToUser).toHaveBeenCalledWith('user-3', 'chat.mention', expect.objectContaining({ id: 'message-1' }));

    await expect(
      service.sendMessage('tenant-1', 'user-1', 'user-2', 'Hello without mentions'),
    ).resolves.toEqual({ id: 'message-2', sentAt });

    await expect(service.getConversation('tenant-1', 'user-1', 'user-2')).resolves.toEqual([
      { id: 'older' },
      { id: 'newer' },
    ]);
    await expect(service.markAsRead('tenant-1', 'message-1', 'user-2')).resolves.toEqual({
      id: 'message-1',
      isRead: 'true',
    });
    await expect(service.markAsRead('tenant-1', 'missing', 'user-2')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getUnreadCount('tenant-1', 'user-2')).resolves.toBe(3);
    await expect(service.getUnreadCount('tenant-1', 'user-2')).resolves.toBe(0);
  });
});
