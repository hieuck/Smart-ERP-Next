// @ts-nocheck
const mockNotifications = {
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
};

const mockSecureStore = {
  getItemAsync: jest.fn(),
};

jest.mock('expo-notifications', () => mockNotifications, { virtual: true });
jest.mock('expo-secure-store', () => mockSecureStore, { virtual: true });
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({ t: (key: string) => `t:${key}` })),
}));

import {
  NotificationHelpers,
  registerForPushNotifications,
  requestNotificationPermissions,
  scheduleLocalNotification,
} from './notifications';

describe('mobile notifications coverage', () => {
  beforeEach(() => {
    mockNotifications.getPermissionsAsync.mockClear();
    mockNotifications.requestPermissionsAsync.mockClear();
    mockNotifications.getExpoPushTokenAsync.mockClear();
    mockNotifications.scheduleNotificationAsync.mockClear();
    mockSecureStore.getItemAsync.mockClear();
    process.env.EXPO_PROJECT_ID = 'expo-project';
    process.env.EXPO_PUBLIC_API_URL = 'https://api.test';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).fetch;
  });

  it('configures notification behavior on module load', async () => {
    expect(mockNotifications.setNotificationHandler).toHaveBeenCalledWith({
      handleNotification: expect.any(Function),
    });
    await expect(mockNotifications.setNotificationHandler.mock.calls[0][0].handleNotification()).resolves.toMatchObject({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    });
  });

  it('requests permissions only when not already granted', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    await expect(requestNotificationPermissions()).resolves.toBe(true);
    expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();

    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    await expect(requestNotificationPermissions()).resolves.toBe(false);
  });

  it('registers push tokens only after permission and server save succeed', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    mockNotifications.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'expo-token' });
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce('tenant-1')
      .mockResolvedValueOnce('user-1');
    (global as any).fetch = jest.fn().mockResolvedValueOnce({ ok: true });

    await expect(registerForPushNotifications()).resolves.toBe('expo-token');
    expect(mockNotifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'expo-project' });
    expect((global as any).fetch).toHaveBeenCalledWith('https://api.test/notifications/register-device', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'X-Tenant-ID': 'tenant-1' }),
    }));

    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    await expect(registerForPushNotifications()).resolves.toBeNull();
  });

  it('returns null when token save cannot resolve tenant/user or network fails', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockNotifications.getExpoPushTokenAsync
      .mockResolvedValueOnce({ data: 'token-no-tenant' })
      .mockResolvedValueOnce({ data: 'token-network' });
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('user-1')
      .mockResolvedValueOnce('tenant-1')
      .mockResolvedValueOnce('user-1');
    (global as any).fetch = jest.fn().mockRejectedValueOnce(new Error('offline'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(registerForPushNotifications()).resolves.toBeNull();
    await expect(registerForPushNotifications()).resolves.toBeNull();
  });

  it('schedules translated local notifications and helper payloads', async () => {
    mockNotifications.scheduleNotificationAsync.mockResolvedValue('notification-1');

    await expect(scheduleLocalNotification('title', 'body', { a: 1 }, 5)).resolves.toBe('notification-1');
    await NotificationHelpers.newApprovalRequest('PO', 100);
    await NotificationHelpers.lowStockAlert('Coffee', 1);
    await NotificationHelpers.orderReceived('SO-1');

    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(1, {
      content: {
        title: 't:title',
        body: 't:body',
        data: { a: 1 },
        sound: 'default',
      },
      trigger: { seconds: 5 },
    });
    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      trigger: null,
    }));
  });
});
