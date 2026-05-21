import { ChatController } from '../chat/chat.controller';
import { ReportsController } from '../reports/reports.controller';
import { ScmController } from '../scm/scm.controller';
import { WebhooksController } from '../modules/webhooks/webhooks.controller';

describe('additional controller delegation coverage', () => {
  const req = { user: { sub: 'user-1', tenantId: 'tenant-1' } };

  describe('ChatController', () => {
    const service = {
      getConversation: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
      sendMessage: jest.fn(),
    };
    const controller = new ChatController(service as any);

    beforeEach(() => jest.clearAllMocks());

    it('wraps conversations, messages, read receipts, and unread counts', async () => {
      service.getConversation.mockResolvedValueOnce([{ id: 'msg-1' }]);
      service.sendMessage.mockResolvedValueOnce({ id: 'msg-2' });
      service.getUnreadCount.mockResolvedValueOnce(4);

      await expect(controller.getConversation(req, 'user-2')).resolves.toEqual({ items: [{ id: 'msg-1' }] });
      await expect(controller.sendMessage(req, { content: 'Xin chao', toUserId: 'user-2' })).resolves.toEqual({
        id: 'msg-2',
      });
      await expect(controller.markRead(req, 'msg-1')).resolves.toEqual({ success: true });
      await expect(controller.getUnreadCount(req)).resolves.toEqual({ unreadCount: 4 });

      expect(service.getConversation).toHaveBeenCalledWith('tenant-1', 'user-1', 'user-2');
      expect(service.sendMessage).toHaveBeenCalledWith('tenant-1', 'user-1', 'user-2', 'Xin chao');
      expect(service.markAsRead).toHaveBeenCalledWith('tenant-1', 'msg-1', 'user-1');
      expect(service.getUnreadCount).toHaveBeenCalledWith('tenant-1', 'user-1');
    });
  });

  describe('ReportsController', () => {
    const service = {
      getCustomerReport: jest.fn(),
      getInventoryReport: jest.fn(),
      getProfitReport: jest.fn(),
      getRevenueReport: jest.fn(),
      getSummary: jest.fn(),
      getTopProducts: jest.fn(),
    };
    const controller = new ReportsController(service as any);

    beforeEach(() => jest.clearAllMocks());

    it('delegates reports with parsed dates, defaults, and parsed limits', () => {
      controller.getRevenue(req, '2026-05-01', '2026-05-21', 'week');
      controller.getRevenue(req, 'not-a-date', undefined, undefined);
      controller.getProfit(req, '2026-05-01', '2026-05-21');
      controller.getTopProducts(req, '2026-05-01', '2026-05-21', '15');
      controller.getTopProducts(req);
      controller.getInventory(req);
      controller.getCustomers(req, '2026-05-01', '2026-05-21');
      controller.getSummary(req, '2026-05-01', '2026-05-21');

      expect(service.getRevenueReport).toHaveBeenNthCalledWith(
        1,
        'tenant-1',
        new Date('2026-05-01'),
        new Date('2026-05-21'),
        'week',
      );
      expect(service.getRevenueReport).toHaveBeenNthCalledWith(
        2,
        'tenant-1',
        expect.any(Date),
        expect.any(Date),
        'day',
      );
      expect(service.getProfitReport).toHaveBeenCalledWith('tenant-1', new Date('2026-05-01'), new Date('2026-05-21'));
      expect(service.getTopProducts).toHaveBeenNthCalledWith(
        1,
        'tenant-1',
        new Date('2026-05-01'),
        new Date('2026-05-21'),
        15,
      );
      expect(service.getTopProducts).toHaveBeenNthCalledWith(2, 'tenant-1', expect.any(Date), expect.any(Date), 10);
      expect(service.getInventoryReport).toHaveBeenCalledWith('tenant-1');
      expect(service.getCustomerReport).toHaveBeenCalledWith(
        'tenant-1',
        new Date('2026-05-01'),
        new Date('2026-05-21'),
      );
      expect(service.getSummary).toHaveBeenCalledWith('tenant-1', new Date('2026-05-01'), new Date('2026-05-21'));
    });
  });

  describe('ScmController', () => {
    const service = {
      approveSuggestion: jest.fn(),
      generateReorderSuggestions: jest.fn(),
      listSuggestions: jest.fn(),
    };
    const controller = new ScmController(service as any);

    beforeEach(() => jest.clearAllMocks());

    it('delegates supply chain actions with tenant context', () => {
      controller.listSuggestions(req);
      controller.runEngine(req);
      controller.approve(req, 'suggestion-1');

      expect(service.listSuggestions).toHaveBeenCalledWith('tenant-1');
      expect(service.generateReorderSuggestions).toHaveBeenCalledWith('tenant-1');
      expect(service.approveSuggestion).toHaveBeenCalledWith('tenant-1', 'suggestion-1');
    });
  });

  describe('WebhooksController', () => {
    const service = {
      create: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getDeliveryLogs: jest.fn(),
      update: jest.fn(),
    };
    const controller = new WebhooksController(service as any);

    beforeEach(() => jest.clearAllMocks());

    it('delegates webhook subscription and delivery log actions', () => {
      controller.findAll(req as any);
      controller.findOne('webhook-1', req as any);
      controller.create({ url: 'https://example.com' }, req as any);
      controller.update('webhook-1', { isActive: false }, req as any);
      controller.delete('webhook-1', req as any);
      controller.getLogs('webhook-1', req as any);

      expect(service.findAll).toHaveBeenCalledWith('tenant-1');
      expect(service.findOne).toHaveBeenCalledWith('webhook-1', 'tenant-1');
      expect(service.create).toHaveBeenCalledWith({ url: 'https://example.com' }, 'tenant-1');
      expect(service.update).toHaveBeenCalledWith('webhook-1', { isActive: false }, 'tenant-1');
      expect(service.delete).toHaveBeenCalledWith('webhook-1', 'tenant-1');
      expect(service.getDeliveryLogs).toHaveBeenCalledWith('webhook-1', 'tenant-1');
    });
  });
});
