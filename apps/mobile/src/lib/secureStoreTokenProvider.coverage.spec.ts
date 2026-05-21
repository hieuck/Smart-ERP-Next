const mockSecureStore = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
};

jest.mock('expo-secure-store', () => mockSecureStore, { virtual: true });

import { SecureStoreTokenProvider } from './secureStoreTokenProvider';

describe('SecureStoreTokenProvider coverage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads token and tenant id from secure storage', async () => {
    const provider = new SecureStoreTokenProvider();
    mockSecureStore.getItemAsync.mockResolvedValueOnce('token-1').mockResolvedValueOnce('tenant-1');

    await expect(provider.getToken()).resolves.toBe('token-1');
    await expect(provider.getTenantId()).resolves.toBe('tenant-1');
  });

  it('returns existing device id or generates and persists a new one', async () => {
    const provider = new SecureStoreTokenProvider();
    mockSecureStore.getItemAsync.mockResolvedValueOnce('device-1');
    await expect(provider.getDeviceId()).resolves.toBe('device-1');

    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    mockSecureStore.getItemAsync.mockResolvedValueOnce(null);
    await expect(provider.getDeviceId()).resolves.toBe('mobile_4fzzzxjy');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('device_id', 'mobile_4fzzzxjy');
  });
});
