import Dexie, { Table } from 'dexie';

export interface OfflineProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  reorderQuantity: number;
  leadTimeDays: number;
  safetyStock: number;
  updatedAt: number;
  deleted: boolean;
}

export interface SyncLog {
  id: number;
  clientId: string;
  lastSyncAt: number;
  vectorClock: Record<string, number>;
}

export class OfflineDatabase extends Dexie {
  products!: Table<OfflineProduct, string>;
  syncLog!: Table<SyncLog, number>;

  constructor() {
    super('SmartERPOffline');
    this.version(1).stores({
      products: 'id, updatedAt, deleted, sku',
      syncLog: '++id, clientId, lastSyncAt',
    });
  }
}

export const db = new OfflineDatabase();

