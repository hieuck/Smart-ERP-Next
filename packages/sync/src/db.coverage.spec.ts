const stores = jest.fn();
const version = jest.fn(() => ({ stores }));
const DexieMock = jest.fn().mockImplementation(() => ({ version }));

jest.mock('dexie', () => ({ __esModule: true, default: DexieMock }));

import { OfflineDB, db } from './db';
import * as indexExports from './index';

describe('sync package db coverage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('configures sync stores and re-exports package modules', () => {
    const instance = new OfflineDB();
    expect(instance).toBeDefined();
    expect(db).toBeDefined();
    expect(indexExports.db).toBeDefined();
    expect(indexExports.SyncService).toBeDefined();
    expect(DexieMock).toHaveBeenCalledWith('SmartERPOffline');
    expect(stores).toHaveBeenCalledWith({
      customers: 'id, tenantId, code, syncedAt',
      entities: 'id, version, lastSyncedAt',
      products: 'id, tenantId, sku, isActive, syncedAt',
      syncQueue: '++id, entity, entityId, createdAt',
      users: 'id, tenantId, syncedAt',
    });
  });
});
