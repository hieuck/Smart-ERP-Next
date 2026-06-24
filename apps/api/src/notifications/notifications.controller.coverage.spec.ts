import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  let notificationsService: any;
  let controller: NotificationsController;

  beforeEach(() => {
    notificationsService = {
      findByUser: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      delete: jest.fn(),
    };
    controller = new NotificationsController(notificationsService);
  });

  describe('getUserNotifications', () => {
    it('delegates to service with limit', async () => {
      notificationsService.findByUser.mockResolvedValue([{ id: 'n1' }]);
      const result = await controller.getUserNotifications('t1', 'u1', '10');
      expect(notificationsService.findByUser).toHaveBeenCalledWith('t1', 'u1', 10);
      expect(result).toEqual([{ id: 'n1' }]);
    });

    it('defaults limit to 50 when not provided', async () => {
      notificationsService.findByUser.mockResolvedValue([]);
      await controller.getUserNotifications('t1', 'u1');
      expect(notificationsService.findByUser).toHaveBeenCalledWith('t1', 'u1', 50);
    });
  });

  describe('getUnreadCount', () => {
    it('delegates to service and returns wrapped count', async () => {
      notificationsService.getUnreadCount.mockResolvedValue(5);
      const result = await controller.getUnreadCount('t1', 'u1');
      expect(notificationsService.getUnreadCount).toHaveBeenCalledWith('t1', 'u1');
      expect(result).toEqual({ unreadCount: 5 });
    });
  });

  describe('markAsRead', () => {
    it('delegates to service and returns success', async () => {
      const dto = { notificationId: 'n1' };
      const result = await controller.markAsRead('t1', 'u1', dto);
      expect(notificationsService.markAsRead).toHaveBeenCalledWith('t1', 'n1', 'u1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('markAllAsRead', () => {
    it('delegates to service and returns success', async () => {
      const result = await controller.markAllAsRead('t1', 'u1');
      expect(notificationsService.markAllAsRead).toHaveBeenCalledWith('t1', 'u1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('deleteNotification', () => {
    it('delegates to service and returns success', async () => {
      const result = await controller.deleteNotification('t1', 'u1', 'n1');
      expect(notificationsService.delete).toHaveBeenCalledWith('t1', 'n1', 'u1');
      expect(result).toEqual({ success: true });
    });
  });
});
