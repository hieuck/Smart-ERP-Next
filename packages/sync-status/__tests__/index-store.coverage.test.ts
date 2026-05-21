jest.mock('../src/sync-service', () => ({
  SyncService: class MockSyncService {},
  createSyncService: jest.fn(),
  getSyncService: jest.fn(),
}));

import { SyncService, createSyncService, emitSyncEvent, getSyncService, useSyncStore } from '../src';

describe('sync-status store index coverage', () => {
  beforeEach(() => {
    useSyncStore.getState().reset();
  });

  it('mutates sync state through direct setters and emitted events', () => {
    const state = useSyncStore.getState();
    state.setStatus('syncing');
    state.setLastSync(new Date('2026-05-21T00:00:00.000Z'));
    state.setPendingChanges(3);
    state.setConflictCount(2);
    state.setError('failed');

    expect(useSyncStore.getState()).toMatchObject({
      status: 'error',
      pendingChanges: 3,
      conflictCount: 2,
      errorMessage: 'failed',
    });

    emitSyncEvent({ type: 'start' });
    expect(useSyncStore.getState().status).toBe('syncing');
    emitSyncEvent({ type: 'success' });
    expect(useSyncStore.getState().status).toBe('idle');
    expect(useSyncStore.getState().lastSync).toBeInstanceOf(Date);

    emitSyncEvent({ type: 'failure', payload: 'offline error' });
    expect(useSyncStore.getState().errorMessage).toBe('offline error');
    emitSyncEvent({ type: 'failure', payload: { message: 'object' } });
    expect(useSyncStore.getState().errorMessage).toBe('Sync failed');
    useSyncStore.getState().setError(null);
    expect(useSyncStore.getState().status).toBe('idle');

    emitSyncEvent({ type: 'offline' });
    expect(useSyncStore.getState().status).toBe('offline');
    emitSyncEvent({ type: 'online' });
    expect(useSyncStore.getState().status).toBe('idle');

    emitSyncEvent({ type: 'pending_changed', payload: 7 });
    emitSyncEvent({ type: 'pending_changed', payload: 'ignored' });
    expect(useSyncStore.getState().pendingChanges).toBe(7);

    useSyncStore.getState().reset();
    expect(useSyncStore.getState()).toMatchObject({
      status: 'idle',
      pendingChanges: 0,
      conflictCount: 0,
      errorMessage: null,
    });

    createSyncService({} as any);
    getSyncService();
    expect(SyncService).toBeDefined();
  });
});
