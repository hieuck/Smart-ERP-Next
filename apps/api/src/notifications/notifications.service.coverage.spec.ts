jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { NotificationsService } from './notifications.service';

const makeSelectChain = (terminal: 'limit' | 'where', rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(rows)),
    orderBy: jest.fn(() => (terminal === 'limit' ? chain : Promise.resolve(rows))),
    where: jest.fn(() => (terminal === 'where' ? Promise.resolve(rows) : chain)),
  };
  return chain;
};

const makeWriteChain = (rows: any[] = []) => {
  const chain: any = {
    returning: jest.fn(() => Promise.resolve(rows)),
    set: jest.fn(() => chain),
    values: jest.fn(() => chain),
    where: jest.fn(() => chain),
  };
  return chain;
};

describe('NotificationsService coverage', () => {
  const db = {
    delete: jest.fn(),
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
  };
  const service = new NotificationsService({ db } as any);

  beforeEach(() => jest.clearAllMocks());

  it('creates notifications and reads them by user', async () => {
    const insertChain = makeWriteChain([{ id: 'notification-1' }]);
    const userChain = makeSelectChain('limit', [{ id: 'user-1' }]);
    const selectChain = makeSelectChain('limit', [{ id: 'notification-1' }]);
    db.insert.mockReturnValueOnce(insertChain);
    db.select.mockReturnValueOnce(userChain).mockReturnValueOnce(selectChain);

    await expect(service.create('tenant-1', { title: 'Hi', userId: 'user-1' } as any)).resolves.toEqual({
      id: 'notification-1',
    });
    await expect(service.findByUser('tenant-1', 'user-1', 25)).resolves.toEqual([{ id: 'notification-1' }]);

    expect(insertChain.values).toHaveBeenCalledWith({ tenantId: 'tenant-1', title: 'Hi', userId: 'user-1' });
    expect(selectChain.limit).toHaveBeenCalledWith(25);

    const defaultLimitChain = makeSelectChain('limit', []);
    db.select.mockReturnValueOnce(defaultLimitChain);
    await expect(service.findByUser('tenant-1', 'user-1')).resolves.toEqual([]);
    expect(defaultLimitChain.limit).toHaveBeenCalledWith(50);
  });

  it('marks, deletes, and counts unread notifications', async () => {
    const updateChain = makeWriteChain();
    const updateAllChain = makeWriteChain();
    const deleteChain = makeWriteChain();
    db.update.mockReturnValueOnce(updateChain).mockReturnValueOnce(updateAllChain);
    db.delete.mockReturnValueOnce(deleteChain);
    db.select
      .mockReturnValueOnce(makeSelectChain('where', [{ count: 7 }]))
      .mockReturnValueOnce(makeSelectChain('where', []));

    await expect(service.markAsRead('tenant-1', 'notification-1', 'user-1')).resolves.toBeUndefined();
    await expect(service.markAllAsRead('tenant-1', 'user-1')).resolves.toBeUndefined();
    await expect(service.delete('tenant-1', 'notification-1', 'user-1')).resolves.toBeUndefined();
    await expect(service.getUnreadCount('tenant-1', 'user-1')).resolves.toBe(7);
    await expect(service.getUnreadCount('tenant-1', 'user-1')).resolves.toBe(0);

    expect(updateChain.set).toHaveBeenCalledWith({ isRead: true, readAt: expect.any(Date) });
    expect(updateAllChain.set).toHaveBeenCalledWith({ isRead: true, readAt: expect.any(Date) });
    expect(deleteChain.where).toHaveBeenCalled();
  });
});
