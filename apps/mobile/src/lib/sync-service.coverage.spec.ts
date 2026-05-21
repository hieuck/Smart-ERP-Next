const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage, { virtual: true });
jest.mock('./api', () => ({ api: {} }));

import { syncService } from './sync-service';

describe('mobile sync service coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
  });

  afterEach(() => jest.restoreAllMocks());

  it('stores last sync timestamp after successful sync', async () => {
    await expect(syncService.sync()).resolves.toEqual({ success: true });
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('last_sync_timestamp', '1770000000000');
  });

  it('reports sync errors and reads last sync time', async () => {
    mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('storage full'));
    await expect(syncService.sync()).resolves.toMatchObject({ success: false, error: expect.any(Error) });

    mockAsyncStorage.getItem.mockResolvedValueOnce('1234').mockResolvedValueOnce(null);
    await expect(syncService.getLastSyncTime()).resolves.toBe(1234);
    await expect(syncService.getLastSyncTime()).resolves.toBeNull();
  });
});
