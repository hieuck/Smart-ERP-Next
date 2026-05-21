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

    (service as any).isOnline = true;
    mockSqliteDb.getFirstAsync
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce(null);

    await expect(service.getState()).resolves.toMatchObject({
      status: "syncing",
      pendingChanges: 2,
      conflictCount: 0,
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

    mockSqliteDb.getAllAsync.mockResolvedValueOnce([
      {
        id: "q-3",
        entity_type: "product",
        entity_id: "p-3",
        operation: "update",
        data: "{\"name\":\"No conflicts key\"}",
        timestamp: "2026-05-20T00:00:00.000Z",
        synced: 0,
      },
    ]);
    mockSqliteDb.getFirstAsync.mockResolvedValueOnce(null);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    }) as jest.Mock;
    await expect(service.sync()).resolves.toEqual({ success: true, synced: 1, conflicts: 0 });
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

  it("resolves conflicts with local and remote versions and ignores missing conflicts", async () => {
    const service = new SyncService(config);
    jest.spyOn(service, "getState").mockResolvedValue({
      status: "idle",
      lastSync: null,
      pendingChanges: 0,
      conflictCount: 0,
      errorMessage: null,
    });
    mockSqliteDb.getFirstAsync.mockImplementation((_query: string, params?: string[]) => {
      if (params?.[0] === "c-local") return Promise.resolve({
        id: "c-local",
        entity_type: "product",
        entity_id: "p-local",
        local_version: "{\"name\":\"Local\"}",
        remote_version: "{\"name\":\"Remote\"}",
      });
      if (params?.[0] === "c-remote") return Promise.resolve({
        id: "c-remote",
        entity_type: "product",
        entity_id: "p-remote",
        local_version: "{\"name\":\"Local\"}",
        remote_version: "{\"name\":\"Remote\"}",
      });
      return Promise.resolve(null);
    });

    await service.resolveConflict("c-local", "local");
    await service.resolveConflict("c-remote", "remote");
    await service.resolveConflict("missing", "local");

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "http://api.test/sync/resolve",
      expect.objectContaining({
        body: JSON.stringify({
          entityType: "product",
          entityId: "p-local",
          chosenVersion: { name: "Local" },
        }),
      }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "http://api.test/sync/resolve",
      expect.objectContaining({
        body: JSON.stringify({
          entityType: "product",
          entityId: "p-remote",
          chosenVersion: { name: "Remote" },
        }),
      }),
    );
  });

  it("updates vector clocks and subscription listeners", async () => {
    const service = new SyncService(config);
    mockSqliteDb.getFirstAsync
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ value: "{\"entity-1\":1}" });

    await (service as any).updateVectorClock("entity-1");
    await (service as any).updateVectorClock("entity-1");

    expect(mockSqliteDb.runAsync).toHaveBeenNthCalledWith(
      1,
      "INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)",
      ["vector_clock", "{\"entity-1\":1}"],
    );
    expect(mockSqliteDb.runAsync).toHaveBeenNthCalledWith(
      2,
      "INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)",
      ["vector_clock", "{\"entity-1\":2}"],
    );

    const listener = jest.fn();
    const unsubscribe = service.subscribe(listener);
    jest.spyOn(service, "getState").mockResolvedValue({
      status: "syncing",
      lastSync: null,
      pendingChanges: 1,
      conflictCount: 0,
      errorMessage: null,
    });
    await service.queueChange({
      entityType: "order",
      entityId: "order-1",
      operation: "create",
      data: { total: 1 },
    });
    await Promise.resolve();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ status: "syncing" }));
    unsubscribe();
    expect((service as any).listeners.has(listener)).toBe(false);
  });

  it("handles empty sync markers and conflict records without detected timestamps", async () => {
    const service = new SyncService(config);

    await expect(service.markAsSynced([])).resolves.toBeUndefined();
    expect(mockSqliteDb.runAsync).not.toHaveBeenCalledWith(expect.stringContaining("UPDATE sync_queue SET synced = 1"), []);

    jest.useFakeTimers().setSystemTime(new Date("2026-05-21T00:00:00.000Z"));
    await (service as any).storeConflicts([
      {
        id: "c-no-date",
        entityType: "product",
        entityId: "p-no-date",
        localVersion: { name: "Local" },
        remoteVersion: { name: "Remote" },
      },
    ]);

    expect(mockSqliteDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO conflicts"),
      expect.arrayContaining(["c-no-date", "product", "p-no-date", "{\"name\":\"Local\"}", "{\"name\":\"Remote\"}", "2026-05-21T00:00:00.000Z"]),
    );
    jest.useRealTimers();
  });

  it("tracks the singleton instance", () => {
    const service = createSyncService(config);

    expect(getSyncService()).toBe(service);
  });
});
