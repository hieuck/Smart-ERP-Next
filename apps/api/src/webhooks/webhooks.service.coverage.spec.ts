jest.mock('@smart-erp/database', () => ({
  webhookSubscriptions: {
    tenantId: 'webhookSubscriptions.tenantId',
    active: 'webhookSubscriptions.active',
    id: 'webhookSubscriptions.id',
  },
  webhookDeliveryLogs: {
    webhookId: 'webhookDeliveryLogs.webhookId',
    createdAt: 'webhookDeliveryLogs.createdAt',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
}));

import { WebhooksService } from './webhooks.service';

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeWriteChain = (returningQueue: any[][]) => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('WebhooksService coverage', () => {
  const selectQueue: any[][] = [];
  const returningQueue: any[][] = [];
  const drizzle = {
    db: {
      insert: jest.fn(() => makeWriteChain(returningQueue)),
      update: jest.fn(() => makeWriteChain(returningQueue)),
      select: jest.fn(() => makeSelectChain(selectQueue.shift() ?? [])),
    },
  };
  const config = { get: jest.fn() };
  const notificationsGateway = {};
  let service: WebhooksService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    service = new WebhooksService(drizzle as any, config as any, notificationsGateway as any);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('creates, lists, deletes, and reads webhook subscriptions', async () => {
    returningQueue.push([{ id: 'sub-1', url: 'https://example.test/hook' }]);
    await expect(service.subscribe('tenant-1', 'https://example.test/hook', ['order.created'], 'secret')).resolves.toEqual({
      id: 'sub-1',
      url: 'https://example.test/hook',
    });
    expect(drizzle.db.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      active: true,
      events: ['order.created'],
      secret: 'secret',
    }));

    selectQueue.push([{ id: 'sub-1' }], [{ id: 'log-1' }]);
    await expect(service.listSubscriptions('tenant-1')).resolves.toEqual([{ id: 'sub-1' }]);
    await expect(service.unsubscribe('tenant-1', 'sub-1')).resolves.toBeUndefined();
    await expect(service.getDeliveryLogs('tenant-1', 'sub-1', 10)).resolves.toEqual([{ id: 'log-1' }]);
    selectQueue.push([{ id: 'log-default' }]);
    await expect(service.getDeliveryLogs('tenant-1', 'sub-1')).resolves.toEqual([{ id: 'log-default' }]);
  });

  it('dispatches only matching subscriptions and logs delivery outcomes', async () => {
    const fetchMock = jest.spyOn(global as any, 'fetch').mockResolvedValue({
      ok: true,
      status: 202,
    } as any);
    selectQueue.push([
      { id: 'sub-1', url: 'https://example.test/order', events: ['order.created'], secret: 'secret' },
      { id: 'sub-2', url: 'https://example.test/payment', events: ['payment.received'] },
    ]);

    await service.dispatch('order.created', 'tenant-1', { orderId: 'order-1' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://example.test/order', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'X-Webhook-Event': 'order.created',
        'X-Webhook-Signature': expect.any(String),
      }),
    }));
    expect(drizzle.db.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({
      webhookId: 'sub-1',
      event: 'order.created',
      statusCode: '202',
    }));

    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as any);
    await (service as any).deliverWebhook(
      { id: 'sub-3', url: 'https://example.test/fail' },
      { event: 'order.created', timestamp: '2026-05-21T00:00:00.000Z', tenantId: 'tenant-1', data: {} },
    );
    expect(drizzle.db.insert.mock.results[1].value.values).toHaveBeenCalledWith(expect.objectContaining({
      webhookId: 'sub-3',
      statusCode: '500',
      error: undefined,
    }));
  });

  it('retries failed delivery attempts and logs the terminal error', async () => {
    jest.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void) => {
      callback();
      return 0 as any;
    }) as any);
    const fetchMock = jest.spyOn(global as any, 'fetch')
      .mockRejectedValueOnce(new Error('network-1'))
      .mockRejectedValueOnce(new Error('network-2'))
      .mockRejectedValueOnce(new Error('network-final'));

    await (service as any).deliverWebhook(
      { id: 'sub-1', url: 'https://example.test/hook' },
      { event: 'order.created', timestamp: '2026-05-21T00:00:00.000Z', tenantId: 'tenant-1', data: {} },
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(drizzle.db.insert.mock.results.at(-1)!.value.values).toHaveBeenCalledWith(expect.objectContaining({
      webhookId: 'sub-1',
      statusCode: '0',
      error: 'network-final',
    }));
  });
});
