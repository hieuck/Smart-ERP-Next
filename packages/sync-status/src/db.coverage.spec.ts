// @ts-nocheck
const mockDatabase = {
  execAsync: jest.fn(),
  closeAsync: jest.fn(),
};

const mockSQLite = {
  openDatabaseAsync: jest.fn(),
};

jest.mock('expo-sqlite', () => mockSQLite);

import { closeDB, getDB, initDB } from './db';

describe('sync-status sqlite db coverage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockDatabase.execAsync.mockResolvedValue(undefined);
    mockDatabase.closeAsync.mockResolvedValue(undefined);
    mockSQLite.openDatabaseAsync.mockResolvedValue(mockDatabase);
    await closeDB();
    mockDatabase.closeAsync.mockClear();
  });

  it('initializes the SQLite schema once and reuses the connection', async () => {
    await expect(initDB()).resolves.toBe(mockDatabase);
    await expect(initDB()).resolves.toBe(mockDatabase);
    await expect(getDB()).resolves.toBe(mockDatabase);

    expect(mockSQLite.openDatabaseAsync).toHaveBeenCalledTimes(1);
    expect(mockDatabase.execAsync).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS sync_queue'));
  });

  it('opens on getDB and closes the cached connection', async () => {
    await expect(getDB()).resolves.toBe(mockDatabase);
    await closeDB();
    await closeDB();

    expect(mockDatabase.closeAsync).toHaveBeenCalledTimes(1);
  });
});
