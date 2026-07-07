jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { BadRequestException } from '@nestjs/common';
import { users } from '@smart-erp/database';
import { NotificationsService } from './notifications.service';

const makeSelectChain = (rows: unknown[]) => {
  const chain: Record<string, jest.Mock> = {
    from: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(rows)),
    where: jest.fn(() => chain),
  };
  return chain;
};

const makeWriteChain = (rows: unknown[] = []) => {
  const chain: Record<string, jest.Mock> = {
    returning: jest.fn(() => Promise.resolve(rows)),
    set: jest.fn(() => chain),
    values: jest.fn(() => chain),
    where: jest.fn(() => chain),
  };
  return chain;
};

describe('NotificationsService.create tenant verification', () => {
  const db = {
    delete: jest.fn(),
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
  };
  const service = new NotificationsService({ db } as any);

  beforeEach(() => jest.clearAllMocks());

  it('creates a notification when the user belongs to the tenant', async () => {
    db.select.mockReturnValueOnce(makeSelectChain([{ id: 'user-1' }]));
    const insertChain = makeWriteChain([{ id: 'notification-1' }]);
    db.insert.mockReturnValueOnce(insertChain);

    const result = await service.create('tenant-1', {
      userId: 'user-1',
      type: 'system',
      title: 'Hello',
      message: 'World',
    } as any);

    expect(result).toEqual({ id: 'notification-1' });
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(insertChain.values).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'system',
      title: 'Hello',
      message: 'World',
    });
  });

  it('throws BadRequestException when the user belongs to a different tenant', async () => {
    db.select.mockReturnValueOnce(makeSelectChain([]));

    await expect(
      service.create('tenant-1', {
        userId: 'user-other',
        type: 'system',
        title: 'Hello',
        message: 'World',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(db.select).toHaveBeenCalledTimes(1);
    expect(db.insert).not.toHaveBeenCalled();
  });
});
