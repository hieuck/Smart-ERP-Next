const stores = jest.fn();
const version = jest.fn(() => ({ stores }));
const DexieMock = jest.fn().mockImplementation(() => ({ version }));

jest.mock('dexie', () => ({ __esModule: true, default: DexieMock }));

import { OfflineDatabase, db } from './offline-db';

describe('web offline db coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('configures product and sync log stores', () => {
    const instance = new OfflineDatabase();
    expect(instance).toBeDefined();
    expect(db).toBeDefined();
    expect(DexieMock).toHaveBeenCalledWith('SmartERPOffline');
    expect(stores).toHaveBeenCalledWith({
      products: 'id, updatedAt, deleted, sku',
      syncLog: '++id, clientId, lastSyncAt',
    });
  });
});
