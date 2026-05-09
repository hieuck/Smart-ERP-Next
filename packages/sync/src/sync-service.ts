import { db, SyncQueueItem } from './db';

export class SyncService {
  private apiBase: string;

  constructor(apiBase: string) {
    this.apiBase = apiBase;
  }

  async queueOperation(entity: string, action: 'create' | 'update' | 'delete', data: any, entityId: string): Promise<void> {
    await db.syncQueue.add({
      entity,
      action,
      data,
      entityId,
      retries: 0,
      createdAt: Date.now()
    });
    // Trigger sync in background
    this.processQueue();
  }

  async processQueue(): Promise<void> {
    const pending = await db.syncQueue.toArray();
    for (const item of pending) {
      try {
        await this.executeSyncItem(item);
        await db.syncQueue.delete(item.id!);
      } catch (err) {
        console.error('Sync failed for item', item.id, err);
        // Increment retries, maybe backoff later
        await db.syncQueue.update(item.id!, { retries: item.retries + 1 });
      }
    }
  }

  private async executeSyncItem(item: SyncQueueItem): Promise<void> {
    const token = localStorage.getItem('access_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    const tenantId = localStorage.getItem('tenant_id');
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    let url = `${this.apiBase}/${item.entity}`;
    let options: RequestInit = { method: 'POST', headers, body: JSON.stringify(item.data) };

    if (item.action === 'update') {
      url = `${this.apiBase}/${item.entity}/${item.entityId}`;
      options = { method: 'PATCH', headers, body: JSON.stringify(item.data) };
    } else if (item.action === 'delete') {
      url = `${this.apiBase}/${item.entity}/${item.entityId}`;
      options = { method: 'DELETE', headers };
    }

    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
  }

  async syncUsers(users: any[]): Promise<void> {
    await db.users.bulkPut(users.map(u => ({ ...u, syncedAt: Date.now() })));
  }

  async getOfflineUsers(): Promise<any[]> {
    return await db.users.toArray();
  }
}

export const syncService = new SyncService(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');
