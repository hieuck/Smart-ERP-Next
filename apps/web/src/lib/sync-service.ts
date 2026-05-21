// @ts-nocheck
import { apiClient } from './api-client';
import { db } from './offline-db';

const getClientId = (): string => {
  let id = (typeof window !== 'undefined' ? localStorage.getItem('sync_client_id') : null);
  if (!id) {
    id = crypto.randomUUID();
    if(typeof window !== 'undefined') localStorage.setItem('sync_client_id', id);
  }
  return id;
};

export class SyncService {
  private clientId = getClientId();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  private async withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000,
    shouldRetry: (err: unknown) => boolean = () => true,
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === retries - 1 || !shouldRetry(err)) throw err;
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    throw new Error('Unreachable');
  }

  async pull(): Promise<void> {
    const lastSync = await db.syncLog.orderBy('lastSyncAt').last();
    const vectorClock = lastSync?.vectorClock || {};

    const res = await this.withRetry(() =>
      apiClient.post('/sync/pull', {
        clientId: this.clientId,
        vectorClock,
      })
    );
    const { changes, vectorClock: newClock } = res.data;

    for (const product of changes.products || []) {
      await db.products.put({ ...product, updatedAt: Date.now() });
    }

    await db.syncLog.add({
      id: Date.now(),
      clientId: this.clientId,
      lastSyncAt: Date.now(),
      vectorClock: newClock,
    });
  }

  private debouncedPush = () => {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.push(), 5000);
  };

  async push(): Promise<void> {
    const lastSync = await db.syncLog.orderBy('lastSyncAt').last();
    const since = lastSync?.lastSyncAt || 0;
    const localChanges = await db.products.where('updatedAt').above(since).toArray();

    if (localChanges.length === 0) return;

    try {
      await this.withRetry(() =>
        apiClient.post('/sync/push', {
          clientId: this.clientId,
          changes: {
            products: localChanges.map(({ id, name, sku, stock, minStock, reorderQuantity, leadTimeDays, safetyStock, deleted }) => ({
              id, name, sku, stock, minStock, reorderQuantity, leadTimeDays, safetyStock, deleted
            })),
          },
        }),
        3,
        1000,
        (err: any) => err.response?.status !== 409,
      );
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Conflict detected – dispatch event for UI
        const conflict = { id: Date.now().toString(), entityType: 'product', local: {}, remote: {} };
        window.dispatchEvent(new CustomEvent('sync-conflict', { detail: conflict }));
        throw new Error('Conflict detected');
      }
      throw err;
    }

    await this.pull();
  }

  async resolveConflict(conflictId: string, choice: 'local' | 'remote'): Promise<void> {
    // TODO: Implement actual conflict resolution with API (send chosen version)
    console.log(`Resolving conflict ${conflictId} by choosing ${choice}`);
    // After resolution, pull again to get fresh data
    await this.pull();
  }

  async sync(): Promise<void> {
    await this.push();
    await this.pull();
  }

  async syncAll(): Promise<void> {
    await this.sync();
  }

  // Call this on any local mutation
  queueSync() {
    this.debouncedPush();
  }
}

export const syncService = new SyncService();
