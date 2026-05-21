const useSyncStore = jest.fn(() => ({ isOnline: true, pendingChanges: 0 }));

jest.mock('@smart-erp/sync-status', () => ({ useSyncStore }));

import { useSyncStatus } from './useSyncStatus';

describe('useSyncStatus hook', () => {
  it('returns the shared sync status store value', () => {
    expect(useSyncStatus()).toEqual({ isOnline: true, pendingChanges: 0 });
    expect(useSyncStore).toHaveBeenCalledTimes(1);
  });
});
