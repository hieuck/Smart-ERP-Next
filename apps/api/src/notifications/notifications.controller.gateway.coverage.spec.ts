import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsController coverage', () => {
  const service = {
    delete: jest.fn(),
    findByUser: jest.fn(),
    getUnreadCount: jest.fn(),
    markAllAsRead: jest.fn(),
    markAsRead: jest.fn(),
  };
  const controller = new NotificationsController(service as any);

  beforeEach(() => jest.clearAllMocks());

  it('delegates user notification queries and mutations with tenant context', async () => {
    service.findByUser.mockResolvedValueOnce([{ id: 'n-1' }]);
    service.getUnreadCount.mockResolvedValueOnce(3);

    await expect(controller.getUserNotifications('tenant-1', 'user-1', '25')).resolves.toEqual([{ id: 'n-1' }]);
    await expect(controller.getUserNotifications('tenant-1', 'user-1')).resolves.toEqual(undefined);
    await expect(controller.getUnreadCount('tenant-1', 'user-1')).resolves.toEqual({ unreadCount: 3 });
    await expect(controller.markAsRead('tenant-1', 'user-1', { notificationId: 'n-1' })).resolves.toEqual({
      success: true,
    });
    await expect(controller.markAllAsRead('tenant-1', 'user-1')).resolves.toEqual({ success: true });
    await expect(controller.deleteNotification('tenant-1', 'user-1', 'n-1')).resolves.toEqual({ success: true });

    expect(service.findByUser).toHaveBeenNthCalledWith(1, 'tenant-1', 'user-1', 25);
    expect(service.findByUser).toHaveBeenNthCalledWith(2, 'tenant-1', 'user-1', 50);
    expect(service.markAsRead).toHaveBeenCalledWith('tenant-1', 'n-1', 'user-1');
    expect(service.markAllAsRead).toHaveBeenCalledWith('tenant-1', 'user-1');
    expect(service.delete).toHaveBeenCalledWith('tenant-1', 'n-1', 'user-1');
  });
});

describe('NotificationsGateway coverage', () => {
  let gateway: NotificationsGateway;
  const to = jest.fn();
  const emit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    to.mockReturnValue({ emit });
    gateway = new NotificationsGateway();
    gateway.server = { emit, to } as any;
  });

  const socket = (id: string, userId?: string, tenantId?: string) =>
    ({
      id,
      handshake: { auth: { tenantId, userId } },
      join: jest.fn(),
    }) as any;

  it('tracks clients and broadcasts tenant or user scoped events', () => {
    const tenantSocket = socket('socket-1', 'user-1', 'tenant-1');
    const otherTenantSocket = socket('socket-2', 'user-2', 'tenant-2');
    const anonymousSocket = socket('socket-3');

    gateway.handleConnection(tenantSocket);
    gateway.handleConnection(otherTenantSocket);
    gateway.handleConnection(anonymousSocket);

    gateway.broadcastToTenant('tenant-1', 'stock.low', { productId: 'p-1' });
    expect(to).toHaveBeenCalledWith('socket-1');
    expect(emit).toHaveBeenCalledWith('stock.low', { productId: 'p-1' });
    expect(to).not.toHaveBeenCalledWith('socket-3');

    gateway.sendToUser('user-2', 'forecast:ready', { productId: 'p-2' });
    expect(to).toHaveBeenCalledWith('socket-2');
    expect(emit).toHaveBeenCalledWith('forecast:ready', { productId: 'p-2' });

    gateway.broadcast('system.alert', { message: 'maintenance' });
    expect(emit).toHaveBeenCalledWith('system.alert', { message: 'maintenance' });

    gateway.handleDisconnect(tenantSocket);
    to.mockClear();
    gateway.broadcastToTenant('tenant-1', 'stock.low', { productId: 'p-3' });
    expect(to).not.toHaveBeenCalledWith('socket-1');
  });

  it('handles room joins and typed notification helpers', () => {
    const client = socket('socket-1', 'user-1', 'tenant-1');
    gateway.handleJoin({ room: 'tenant-1' }, client);
    expect(client.join).toHaveBeenCalledWith('tenant-1');

    const tenantSpy = jest.spyOn(gateway, 'broadcastToTenant').mockImplementation(jest.fn());
    const userSpy = jest.spyOn(gateway, 'sendToUser').mockImplementation(jest.fn());

    gateway.notifyNewApproval('tenant-1', 'approval-1', 'New approval');
    gateway.notifyApprovalDecision('tenant-1', 'approval-1', 'approved', 'Approved');
    gateway.notifyLowStock('tenant-1', 'product-1', 'Coffee', 2);
    gateway.notifyForecastReady('tenant-1', 'user-1', 'product-2');

    expect(tenantSpy).toHaveBeenCalledWith('tenant-1', 'approval:new', {
      requestId: 'approval-1',
      message: 'New approval',
    });
    expect(tenantSpy).toHaveBeenCalledWith('tenant-1', 'approval:decision', {
      requestId: 'approval-1',
      status: 'approved',
      message: 'Approved',
    });
    expect(tenantSpy).toHaveBeenCalledWith('tenant-1', 'stock.low', {
      productId: 'product-1',
      productName: 'Coffee',
      currentStock: 2,
    });
    expect(userSpy).toHaveBeenCalledWith('user-1', 'forecast:ready', { productId: 'product-2' });
  });
});
