import { WebhooksService } from './webhooks.service';

const mockDb = {
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([{ id: 'wh-1', url: 'https://hook.example.com', events: ['order.created'], active: true }]),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('WebhooksService', () => {
  let service: WebhooksService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WebhooksService({ db: mockDb } as any, { get: jest.fn() } as any, { sendNotification: jest.fn() } as any);
  });

  it('subscribe creates webhook', async () => {
    mockDb.returning.mockResolvedValue([{ id: 'wh-1', url: 'https://hook.example.com', events: ['order.created'], active: true }]);
    const result = await service.subscribe('t1', 'https://hook.example.com', ['order.created']);
    expect(result.id).toBe('wh-1');
  });

  it('listSubscriptions returns array', async () => {
    mockDb.where.mockResolvedValue([{ id: 'wh-1', active: true }]);
    const result = await service.listSubscriptions('t1');
    expect(result).toHaveLength(1);
  });

  it('unsubscribe deactivates webhook', async () => {
    mockDb.where.mockResolvedValue(undefined);
    await service.unsubscribe('t1', 'wh-1');
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('getDeliveryLogs returns logs', async () => {
    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockReturnThis();
    mockDb.limit.mockResolvedValue([{ id: 'log-1', webhookId: 'wh-1', status: 'success' }]);
    const result = await service.getDeliveryLogs('t1', 'wh-1');
    expect(result).toHaveLength(1);
  });

  it('dispatch sends webhook to matching subscriptions', async () => {
    mockDb.where.mockResolvedValue([{ id: 'wh-1', url: 'https://hook.example.com', events: ['order.created'], active: true, secret: 'secret123' }]);
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    mockDb.insert.mockReturnValue({ values: jest.fn() });

    await service.dispatch('order.created', 't1', { orderId: 'o-1' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://hook.example.com',
      expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'X-Webhook-Event': 'order.created' }) }),
    );
  });

  it('dispatch handles no matching subscriptions gracefully', async () => {
    mockDb.where.mockResolvedValue([]);
    await service.dispatch('order.created', 't1', {});
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
