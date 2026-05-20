const mockDb = {
  entities: {
    get: jest.fn(),
    put: jest.fn(),
    update: jest.fn(),
  },
  syncQueue: {
    add: jest.fn(),
    toArray: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  users: {
    bulkPut: jest.fn(),
    toArray: jest.fn(),
  },
  products: {
    bulkPut: jest.fn(),
    toArray: jest.fn(),
  },
  customers: {
    bulkPut: jest.fn(),
    toArray: jest.fn(),
  },
};

jest.mock("../src/db", () => ({ db: mockDb }));

import { LocalStorageTokenProvider, SyncService } from "../src/sync-service";
import type { TokenProvider } from "../src/sync-service";

const tokenProvider: TokenProvider = {
  getToken: jest.fn().mockResolvedValue("token-1"),
  getTenantId: jest.fn().mockResolvedValue("tenant-1"),
  getDeviceId: jest.fn().mockResolvedValue("device-1"),
};

describe("SyncService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
    mockDb.entities.get.mockResolvedValue(null);
    mockDb.syncQueue.toArray.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).fetch;
  });

  it("queues operations with incremented vector clocks", async () => {
    const service = new SyncService("http://api.test", tokenProvider);
    jest.spyOn(service, "processQueue").mockResolvedValue(undefined);
    mockDb.entities.get.mockResolvedValue({
      version: 3,
      vectorClock: { other: 2 },
    });

    await service.queueOperation("products", "update", { name: "Keyboard" }, "p-1");

    expect(mockDb.syncQueue.add).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "products",
        action: "update",
        data: { name: "Keyboard" },
        entityId: "p-1",
        retries: 0,
        version: 4,
        vectorClock: { other: 2, "device-1": 4 },
      }),
    );
    expect(service.processQueue).toHaveBeenCalled();
  });

  it("processes successful create, update, and delete queue items", async () => {
    const service = new SyncService("http://api.test", tokenProvider);
    mockDb.syncQueue.toArray.mockResolvedValue([
      { id: 1, entity: "products", action: "create", data: { name: "A" }, entityId: "p-1", retries: 0, createdAt: 1, version: 1, vectorClock: { "device-1": 1 } },
      { id: 2, entity: "products", action: "update", data: { name: "B" }, entityId: "p-2", retries: 0, createdAt: 2, version: 2, vectorClock: { "device-1": 2 } },
      { id: 3, entity: "products", action: "delete", data: {}, entityId: "p-3", retries: 0, createdAt: 3, version: 3, vectorClock: { "device-1": 3 } },
    ]);

    await service.processQueue();

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "http://api.test/products",
      expect.objectContaining({ method: "POST" }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "http://api.test/products/p-2",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      "http://api.test/products/p-3",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(mockDb.entities.put).toHaveBeenCalledTimes(3);
    expect(mockDb.syncQueue.delete).toHaveBeenCalledTimes(3);
  });

  it("stores remote conflict winners and removes the queued item", async () => {
    const service = new SyncService("http://api.test", tokenProvider);
    mockDb.syncQueue.toArray.mockResolvedValue([
      {
        id: 7,
        entity: "products",
        action: "update",
        data: { name: "Local" },
        entityId: "p-7",
        retries: 1,
        createdAt: 7,
        version: 2,
        vectorClock: { "device-1": 1 },
      },
    ]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: jest.fn().mockResolvedValue({
        version: 4,
        data: { name: "Remote" },
        vectorClock: { "device-1": 2 },
      }),
    }) as jest.Mock;

    await service.processQueue();

    expect(mockDb.entities.update).toHaveBeenCalledWith(
      "p-7",
      expect.objectContaining({
        data: expect.objectContaining({ name: "Remote" }),
        version: 4,
        vectorClock: { "device-1": 2 },
      }),
    );
    expect(mockDb.syncQueue.delete).toHaveBeenCalledWith(7);
  });

  it("increments retry count when a queue item fails", async () => {
    const service = new SyncService("http://api.test", tokenProvider);
    mockDb.syncQueue.toArray.mockResolvedValue([
      { id: 9, entity: "orders", action: "create", data: {}, entityId: "o-9", retries: 2, createdAt: 9 },
    ]);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as jest.Mock;

    await service.processQueue();

    expect(mockDb.syncQueue.update).toHaveBeenCalledWith(9, { retries: 3 });
  });

  it("caches and reads offline entities", async () => {
    const service = new SyncService("http://api.test", tokenProvider);
    mockDb.users.toArray.mockResolvedValue([{ id: "u-1" }]);
    mockDb.products.toArray.mockResolvedValue([{ id: "p-1" }]);
    mockDb.customers.toArray.mockResolvedValue([{ id: "c-1" }]);

    await service.syncUsers([{ id: "u-1" }]);
    await service.syncProducts([{ id: "p-1" }]);
    await service.syncCustomers([{ id: "c-1" }]);

    expect(mockDb.users.bulkPut).toHaveBeenCalledWith([expect.objectContaining({ id: "u-1", syncedAt: expect.any(Number) })]);
    expect(mockDb.products.bulkPut).toHaveBeenCalledWith([expect.objectContaining({ id: "p-1", syncedAt: expect.any(Number) })]);
    expect(mockDb.customers.bulkPut).toHaveBeenCalledWith([expect.objectContaining({ id: "c-1", syncedAt: expect.any(Number) })]);
    await expect(service.getOfflineUsers()).resolves.toEqual([{ id: "u-1" }]);
    await expect(service.getOfflineProducts()).resolves.toEqual([{ id: "p-1" }]);
    await expect(service.getOfflineCustomers()).resolves.toEqual([{ id: "c-1" }]);
  });
});

describe("LocalStorageTokenProvider", () => {
  afterEach(() => {
    delete (global as any).localStorage;
  });

  it("uses server-safe defaults without localStorage", async () => {
    const provider = new LocalStorageTokenProvider();

    await expect(provider.getToken()).resolves.toBeNull();
    await expect(provider.getTenantId()).resolves.toBeNull();
    await expect(provider.getDeviceId()).resolves.toBe("server");
  });

  it("reads existing browser credentials and persists a generated device id", async () => {
    const storage = new Map<string, string>([
      ["access_token", "token-1"],
      ["tenant_id", "tenant-1"],
    ]);
    (global as any).localStorage = {
      getItem: jest.fn((key: string) => storage.get(key) ?? null),
      setItem: jest.fn((key: string, value: string) => storage.set(key, value)),
    };
    jest.spyOn(Math, "random").mockReturnValue(0.123456789);
    const provider = new LocalStorageTokenProvider();

    await expect(provider.getToken()).resolves.toBe("token-1");
    await expect(provider.getTenantId()).resolves.toBe("tenant-1");
    await expect(provider.getDeviceId()).resolves.toMatch(/^device_/);
    expect(localStorage.setItem).toHaveBeenCalledWith("device_id", expect.stringMatching(/^device_/));
  });
});
