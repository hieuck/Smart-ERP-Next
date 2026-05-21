const mockInvoke = jest.fn();
const mockSetProducts = jest.fn();
const mockSetSyncing = jest.fn();
const mockUseEffect = jest.fn((callback: () => void) => callback());
const mockUseState = jest
  .fn()
  .mockReturnValueOnce([[], mockSetProducts])
  .mockReturnValueOnce([false, mockSetSyncing]);

jest.mock('@tauri-apps/api/tauri', () => ({ invoke: mockInvoke }), { virtual: true });
jest.mock('react', () => ({
  useEffect: mockUseEffect,
  useState: mockUseState,
}));

import { useOfflineSync } from './useOfflineSync';

describe('desktop useOfflineSync coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseState
      .mockReturnValueOnce([[], mockSetProducts])
      .mockReturnValueOnce([false, mockSetSyncing]);
  });

  it('initializes local database and maps offline products', async () => {
    mockInvoke.mockResolvedValueOnce(undefined).mockResolvedValueOnce([
      {
        deleted: 1,
        id: 'product-1',
        leadTimeDays: 2,
        minStock: 1,
        name: 'Coffee',
        reorderQuantity: 5,
        safetyStock: 3,
        sku: 'CF-1',
        stock: 10,
        updatedAt: 1770000000000,
      },
    ]);

    useOfflineSync();
    await Promise.resolve();

    expect(mockInvoke).toHaveBeenCalledWith('init_offline_db');
    expect(mockInvoke).toHaveBeenCalledWith('get_offline_products');
    expect(mockSetProducts).toHaveBeenCalledWith([
      {
        deleted: true,
        id: 'product-1',
        leadTimeDays: 2,
        minStock: 1,
        name: 'Coffee',
        reorderQuantity: 5,
        safetyStock: 3,
        sku: 'CF-1',
        stock: 10,
        updatedAt: 1770000000000,
      },
    ]);
  });

  it('syncs offline changes and resets syncing state on success or failure', async () => {
    mockInvoke.mockResolvedValue([]);
    const state = useOfflineSync();
    await state.syncNow();

    expect(mockSetSyncing).toHaveBeenNthCalledWith(1, true);
    expect(mockInvoke).toHaveBeenCalledWith('sync_offline_changes');
    expect(mockSetSyncing).toHaveBeenLastCalledWith(false);

    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockInvoke.mockRejectedValueOnce(new Error('sync failed'));
    await state.syncNow();

    expect(error).toHaveBeenCalledWith('Sync failed', expect.any(Error));
    expect(mockSetSyncing).toHaveBeenLastCalledWith(false);
    error.mockRestore();
  });
});
