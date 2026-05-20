const mockSqliteDb = {
  runAsync: jest.fn(),
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
};

jest.mock("../src/db", () => ({
  initDB: jest.fn().mockResolvedValue(mockSqliteDb),
  getDB: jest.fn().mockResolvedValue(mockSqliteDb),
}));

import { SyncService, createSyncService, getSyncService } from "../src/sync-service";

const config = {
  apiBaseUrl: "http://api.test",
  tenantId: "tenant-1",
  userId: "user-1",
  authToken: "token-1",
};

describe("sync-status SyncService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ conflicts: [] }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).fetch;
    delete (global as any).window;
  });

  it("initializes the database and reacts to connectivity events", async () => {
    const handlers: Record<string, () => void> = {};
    (global as any).window = {
      addEventListener: jest.fn((event: string, handler: () => void) => {
        handlers[event] = handler;
      }),
    };
    const service = new SyncService(config);
    const syncSpy = jest.spyOn(service, "sync").mockResolvedValue({ success: true, synced: 0, conflicts: 0 });

    await service.init();
    handlers.offline();
    await expect(service.isOnlineStatus()).resolves.toBe(false);
    handlers.online();

    await expect(service.isOnlineStatus()).resolves.toBe(true);
    expect(syncSpy).toHaveBeenCalled();
  });

  it("queues a change with serialized data and default sync flags", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    jest.spyOn(Math, "random").mockReturnValue(0.123456789);
    const service = new SyncService(config);

    await service.queueChange({
      entityType: "product",
      entityId: "p-1",
      operation: "update",
      data: { stock: 5 },
    });

    expect(mockSqliteDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO sync_queue"),
      [
        expect.stringMatching(/^1700000000000-/),
        "product",
        "p-1",
        "update",
        JSON.stringify({ stock: 5 }),
        expect.any(String),
      ],
    );
  });

  it("maps pending changes and counts pending/conflict rows", async () => {
    const service = new SyncService(config);
    mockSqliteDb.getAllAsync.mockResolvedValue([
      {
        id: "q-1",
        entity_type: "order",
        entity_id: "o-1",
        operation: "create",
        data: "{\"total\":10}",
        timestamp: "2026-05-20T00:00:00.000Z",
        synced: 0,
      },
    ]);
    mockSqliteDb.getFirstAsync
      .mockResolvedValueOnce({ count: 3 })
      .mockResolvedValueOnce({ count: 2 });

    await expect(service.getPendingChanges()).resolves.toEqual([
      {
        id: "q-1",
        entityType: "order",
        entityId: "o-1",
        operation: "create",
        data: { total: 10 },
        timestamp: "2026-05-20T00:00:00.000Z",
        synced: false,
      },
    ]);
    await expect(service.getPendingCount()).resolves.toBe(3);
    await expect(service.getConflictCount()).resolves.toBe(2);
  });

  it("returns offline and idle state from pending counts", async () => {
    const service = new SyncService(config);
    mockSqliteDb.getFirstAsync
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ value: "2026-05-20T00:00:00.000Z" });

    await expect(service.getState()).resolves.toMatchObject({
      status: "idle",
      pendingChanges: 0,
      conflictCount: 0,
      lastSync: new Date("2026-05-20T00:00:00.000Z"),
    });

    (service as any).isOnline = false;
    mockSqliteDb.getFirstAsync
      .mockResolvedValueOnce({ count: 4 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce(null);

    await expect(service.getState()).resolves.toMatchObject({
      status: "offline",
      pendingChanges: 4,
      conflictCount: 1,
      lastSync: null,
    });
  });

  it("syncs pending changes, stores conflicts, and marks rows as synced", async () => {
    const service = new SyncService(config);
    mockSqliteDb.getAllAsync.mockResolvedValue([
      {
        id: "q-1",
        entity_type: "product",
        entity_id: "p-1",
        operation: "update",
        data: "{\"name\":\"Remote\"}",
        timestamp: "2026-05-20T00:00:00.000Z",
        synced: 0,
      },
    ]);
    mockSqliteDb.getFirstAsync.mockResolvedValue({ value: "{\"p-1\":2}" });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        conflicts: [
          {
            id: "c-1",
            entityType: "product",
            entityId: "p-1",
            localVersion: { name: "Local" },
            remoteVersion: { name: "Remote" },
            detectedAt: "2026-05-20T01:00:00.000Z",
          },
        ],
      }),
    }) as jest.Mock;

    await expect(service.sync()).resolves.toEqual({ success: true, synced: 1, conflicts: 1 });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://api.test/sync/push",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token-1" }),
      }),
    );
    expect(mockSqliteDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE sync_queue SET synced = 1"),
      ["q-1"],
    );
    expect(mockSqliteDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO conflicts"),
      expect.arrayContaining(["c-1", "product", "p-1"]),
    );
  });

  it("handles offline, empty, and failed sync attempts", async () => {
    const service = new SyncService(config);
    (service as any).isOnline = false;
    await expect(service.sync()).resolves.toEqual({ success: false, synced: 0, conflicts: 0 });

    (service as any).isOnline = true;
    mockSqliteDb.getAllAsync.mockResolvedValue([]);
    await expect(service.sync()).resolves.toEqual({ success: true, synced: 0, conflicts: 0 });

    mockSqliteDb.getAllAsync.mockResolvedValue([
      {
        id: "q-2",
        entity_type: "product",
        entity_id: "p-2",
        operation: "delete",
        data: "{}",
        timestamp: "2026-05-20T00:00:00.000Z",
        synced: 0,
      },
    ]);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as jest.Mock;
    await expect(service.sync()).resolves.toEqual({ success: false, synced: 0, conflicts: 0 });
  });

  it("resolves conflicts and maps unresolved conflicts", async () => {
    const service = new SyncService(config);
    mockSqliteDb.getFirstAsync.mockResolvedValue({
      id: "c-1",
      entity_type: "product",
      entity_id: "p-1",
      local_version: "{\"name\":\"Local\"}",
      remote_version: "{\"name\":\"Remote\"}",
    });

    await service.resolveConflict("c-1", "merge", { name: "Merged" });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://api.test/sync/resolve",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          entityType: "product",
          entityId: "p-1",
          chosenVersion: { name: "Merged" },
        }),
      }),
    );
    expect(mockSqliteDb.runAsync).toHaveBeenCalledWith("UPDATE conflicts SET resolved = 1 WHERE id = ?", ["c-1"]);

    mockSqliteDb.getAllAsync.mockResolvedValue([
      {
        id: "c-2",
        entity_type: "order",
        entity_id: "o-2",
        local_version: "{\"total\":10}",
        remote_version: "{\"total\":20}",
        detected_at: "2026-05-20T02:00:00.000Z",
        resolved: 0,
      },
    ]);
    await expect(service.getConflicts()).resolves.toEqual([
      {
        id: "c-2",
        entityType: "order",
        entityId: "o-2",
        localVersion: { total: 10 },
        remoteVersion: { total: 20 },
        detectedAt: "2026-05-20T02:00:00.000Z",
        resolved: false,
      },
    ]);
  });

  it("tracks the singleton instance", () => {
    const service = createSyncService(config);

    expect(getSyncService()).toBe(service);
  });
});
