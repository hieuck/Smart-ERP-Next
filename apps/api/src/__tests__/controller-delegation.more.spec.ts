import { WebhooksController } from '../webhooks/webhooks.controller';

describe('additional controller delegation coverage', () => {
  const req = { user: { sub: 'user-1', tenantId: 'tenant-1' } };

  describe('WebhooksController', () => {
    const service = {
      subscribe: jest.fn(),
      listSubscriptions: jest.fn(),
      unsubscribe: jest.fn(),
      getDeliveryLogs: jest.fn(),
    };
    const controller = new WebhooksController(service as any);

    beforeEach(() => jest.clearAllMocks());

    it('delegates webhook subscription and delivery log actions', () => {
      controller.subscribe(req as any, { url: 'https://example.com', events: ['order.created'] });
      controller.listSubscriptions(req as any);
      controller.unsubscribe(req as any, 'wh-1');
      controller.getDeliveryLogs(req as any, 'wh-1', '10');

      expect(service.subscribe).toHaveBeenCalled();
      expect(service.listSubscriptions).toHaveBeenCalledWith('tenant-1');
      expect(service.unsubscribe).toHaveBeenCalledWith('tenant-1', 'wh-1');
      expect(service.getDeliveryLogs).toHaveBeenCalledWith('tenant-1', 'wh-1', 10);
    });
  });
});
