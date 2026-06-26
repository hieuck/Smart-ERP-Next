import { WebhooksService } from '../webhooks/webhooks.service';

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
  execute: jest.fn(),
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('WebhooksService (direct instantiation)', () => {
  let service: WebhooksService;
  let mockConfig: any;
  let mockNotificationsGateway: any;
  const TENANT_ID = 'tenant-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig = { get: jest.fn() };
    mockNotificationsGateway = {
      broadcastToTenant: jest.fn(),
      sendToUser: jest.fn(),
      broadcast: jest.fn(),
    };
    service = new WebhooksService(
      { db: mockDb } as any,
      mockConfig as any,
      mockNotificationsGateway,
    );
  });

  describe('subscribe', () => {
    it('creates a webhook subscription', async () => {
      const subscription = { id: 'sub-1', tenantId: TENANT_ID, url: 'https://hook.test', events: ['order.created'], active: true };
      mockDb.returning.mockResolvedValue([subscription]);

      const result = await service.subscribe(TENANT_ID, 'https://hook.test', ['order.created']);

      expect(result).toEqual(subscription);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('listSubscriptions', () => {
    it('returns active subscriptions for tenant', async () => {
      const subscriptions = [
        { id: 'sub-1', tenantId: TENANT_ID, url: 'https://hook.test', events: ['order.created'], active: true },
      ];
      mockDb.where.mockResolvedValue(subscriptions);

      const result = await service.listSubscriptions(TENANT_ID);

      expect(result).toEqual(subscriptions);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('deactivates a subscription', async () => {
      mockDb.where.mockResolvedValue(undefined);

      await service.unsubscribe(TENANT_ID, 'sub-1');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
    });
  });

  describe('dispatch', () => {
    it('delivers webhook to matching subscriptions', async () => {
      mockDb.where.mockResolvedValue([
        { id: 'sub-1', url: 'https://hook.test/a', events: ['order.created'], active: true, secret: 'sec1' },
        { id: 'sub-2', url: 'https://hook.test/b', events: ['order.created'], active: true, secret: undefined },
      ]);
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      mockDb.insert.mockReturnValue({ values: jest.fn() });

      await service.dispatch('order.created', TENANT_ID, { orderId: 'o-1' });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hook.test/a',
        expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'X-Webhook-Event': 'order.created' }) }),
      );
    });

    it('skips subscriptions that do not match event', async () => {
      mockDb.where.mockResolvedValue([
        { id: 'sub-1', url: 'https://hook.test/a', events: ['payment.received'], active: true, secret: undefined },
      ]);

      await service.dispatch('order.created', TENANT_ID, { orderId: 'o-1' });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles delivery failures gracefully', async () => {
      mockDb.where.mockResolvedValue([
        { id: 'sub-1', url: 'https://hook.test/a', events: ['order.created'], active: true, secret: undefined },
      ]);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await service.dispatch('order.created', TENANT_ID, { orderId: 'o-1' });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 15000);
  });

  describe('getDeliveryLogs', () => {
    it('returns delivery logs for a subscription', async () => {
      const logs = [
        { webhookId: 'sub-1', event: 'order.created', statusCode: '200' },
      ];
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValue(logs);

      const result = await service.getDeliveryLogs(TENANT_ID, 'sub-1');

      expect(result).toEqual(logs);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalled();
    });
  });
});
