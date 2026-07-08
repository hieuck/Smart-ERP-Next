const mockExecute = jest.fn().mockResolvedValue(undefined);
const mockLoad = jest.fn().mockResolvedValue({ execute: mockExecute });

jest.doMock(
  '@tauri-apps/plugin-sql',
  () => ({
    __esModule: true,
    default: { load: mockLoad },
  }),
  { virtual: true }
);

import { initOfflineDb, isReady, cacheOrder } from './desktop-sync-service';

describe('desktop-sync-service', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    global.window = { __TAURI__: {} };
  });

  afterEach(() => {
    // @ts-ignore
    global.window = originalWindow;
  });

  it('sets isReady to true when Database.load succeeds', async () => {
    await initOfflineDb();

    expect(mockLoad).toHaveBeenCalledWith('sqlite:smart_erp.db');
    expect(mockExecute).toHaveBeenCalled();
    expect(isReady).toBe(true);
  });

  it('logs an error and sets isReady to false when Database.load fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Tauri SQL plugin unavailable');
    mockLoad.mockRejectedValueOnce(error);

    await initOfflineDb();

    expect(isReady).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[desktop-sync] Failed to initialize offline database:',
      error
    );
    consoleSpy.mockRestore();
  });

  it('does not initialize when window.__TAURI__ is missing', async () => {
    // @ts-ignore
    global.window = {};

    await initOfflineDb();

    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('does not cache orders when offline db is not ready', async () => {
    mockLoad.mockRejectedValueOnce(new Error('fail'));
    await initOfflineDb();

    await cacheOrder('1', '{}');

    expect(mockExecute).not.toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO cached_orders (id, data, updated_at) VALUES (?, ?, ?)',
      expect.any(Array)
    );
  });
});
