jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
}));

import { WebhooksService } from './webhooks.service';

const makeSelectChain = (terminal: 'where' | 'single', rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => Promise.resolve(rows)),
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

describe('module WebhooksService coverage', () => {
  const db = {
    delete: jest.fn(),
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
  };
  const service = new WebhooksService(db as any);

  beforeEach(() => jest.clearAllMocks());

  it('reads webhook subscriptions and delivery logs by tenant', async () => {
    db.select
      .mockReturnValueOnce(makeSelectChain('where', [{ id: 'webhook-1' }]))
      .mockReturnValueOnce(makeSelectChain('single', [{ id: 'webhook-2' }]))
      .mockReturnValueOnce(makeSelectChain('where', [{ id: 'log-1' }]));

    await expect(service.findAll('tenant-1')).resolves.toEqual([{ id: 'webhook-1' }]);
    await expect(service.findOne('webhook-2', 'tenant-1')).resolves.toEqual({ id: 'webhook-2' });
    await expect(service.getDeliveryLogs('webhook-1', 'tenant-1')).resolves.toEqual([{ id: 'log-1' }]);
  });

  it('creates, updates, and deletes webhook subscriptions', async () => {
    const insertChain = makeWriteChain([{ id: 'webhook-1' }]);
    const updateChain = makeWriteChain([{ id: 'webhook-1', isActive: false }]);
    const deleteChain = makeWriteChain();
    db.insert.mockReturnValueOnce(insertChain);
    db.update.mockReturnValueOnce(updateChain);
    db.delete.mockReturnValueOnce(deleteChain);

    await expect(service.create({ url: 'https://example.com' } as any, 'tenant-1')).resolves.toEqual({
      id: 'webhook-1',
    });
    await expect(service.update('webhook-1', { isActive: false } as any, 'tenant-1')).resolves.toEqual({
      id: 'webhook-1',
      isActive: false,
    });
    await expect(service.delete('webhook-1', 'tenant-1')).resolves.toEqual({ success: true });

    expect(insertChain.values).toHaveBeenCalledWith({ tenantId: 'tenant-1', url: 'https://example.com' });
    expect(updateChain.set).toHaveBeenCalledWith({ isActive: false, updatedAt: expect.any(Date) });
    expect(deleteChain.where).toHaveBeenCalled();
  });
});
