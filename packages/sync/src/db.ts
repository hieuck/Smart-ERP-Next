import Dexie, { Table } from 'dexie';

export interface StoredUser {
  id: string;
  email: string;
  name: string | null;
  tenantId: string;
  role: string;
  syncedAt: number;
}

export interface SyncQueueItem {
  id?: number;
  entity: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  entityId: string;
  retries: number;
  createdAt: number;
}

export class OfflineDB extends Dexie {
  users!: Table<StoredUser, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('SmartERPOffline');
    this.version(1).stores({
      users: 'id, tenantId, syncedAt',
      syncQueue: '++id, entity, entityId, createdAt'
    });
  }
}

export const db = new OfflineDB();
