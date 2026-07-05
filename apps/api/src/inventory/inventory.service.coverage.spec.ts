const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  execute: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  products: {
    id: 'products.id',
    tenantId: 'products.tenantId',
    name: 'products.name',
    sku: 'products.sku',
    stock: 'products.stock',
    minStock: 'products.minStock',
    reorderQuantity: 'products.reorderQuantity',
    isActive: 'products.isActive',
    updatedAt: 'products.updatedAt',
  },
  inventoryTransactions: {
    tenantId: 'transactions.tenantId',
    productId: 'transactions.productId',
    type: 'transactions.type',
    createdAt: 'transactions.createdAt',
  },
  inventoryReservations: {
    id: 'reservations.id',
    tenantId: 'reservations.tenantId',
    productId: 'reservations.productId',
    storeId: 'reservations.storeId',
    externalOrderId: 'reservations.externalOrderId',
    status: 'reservations.status',
    quantityReserved: 'reservations.quantityReserved',
  },
  ecommerceStores: {
    id: 'stores.id',
    tenantId: 'stores.tenantId',
    isActive: 'stores.isActive',
  },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  gte: jest.fn((field, value) => ({ op: 'gte', field, value })),
  lte: jest.fn((field, value) => ({ op: 'lte', field, value })),
}));

import { ConflictException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

const selectQueue: any[][] = [];
const updateQueue: any[][] = [];
const insertQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    offset: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeWriteChain = (queue: any[][] = []) => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(queue.shift() ?? [])),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('InventoryService coverage', () => {
  let service: InventoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T03:00:00.000Z'));
    selectQueue.length = 0;
    updateQueue.length = 0;
    insertQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.update.mockImplementation(() => makeWriteChain(updateQueue));
    mockDb.insert.mockImplementation(() => makeWriteChain(insertQueue));
    mockDb.execute.mockResolvedValue({ rows: [] });
    service = new InventoryService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('returns reorder suggestions and paginated transactions', async () => {
    selectQueue.push([
      { id: 'p1', name: 'Ao', sku: 'SKU-1', stock: 2, minStock: 5, reorderQuantity: 10 },
      { id: 'p2', name: 'Quan', sku: 'SKU-2', stock: 4, minStock: 5, reorderQuantity: 0 },
      { id: 'p3', name: 'Giay', sku: 'SKU-3', stock: 20, minStock: 5, reorderQuantity: 5 },
      { id: 'p4', name: 'Mu', sku: 'SKU-4', stock: 0, minStock: 0, reorderQuantity: 5 },
      { id: 'p5', name: 'Tui', sku: 'SKU-5', stock: 2, minStock: 5 },
      { id: 'p6', name: 'Khan', sku: 'SKU-6', stock: 1, minStock: null, reorderQuantity: 4 },
      { id: 'p7', name: 'Tat', sku: 'SKU-7', stock: 5, minStock: 5, reorderQuantity: 0 },
    ]);

    await expect(service.getReorderSuggestions('tenant-1')).resolves.toEqual([
      expect.objectContaining({ id: 'p1', suggestedOrderQuantity: 10 }),
      expect.objectContaining({ id: 'p2', suggestedOrderQuantity: 1 }),
      expect.objectContaining({ id: 'p5', suggestedOrderQuantity: 3 }),
    ]);

    selectQueue.push([{ count: 205 }], [{ id: 'tx-1' }]);
    await expect(service.getTransactions('tenant-1', {
      page: 3,
      limit: 500,
      productId: 'p1',
      type: 'IN',
    })).resolves.toEqual({
      items: [{ id: 'tx-1' }],
      total: 205,
      page: 3,
      limit: 100,
      totalPages: 3,
    });

    selectQueue.push([{ count: 0 }], []);
    await expect(service.getTransactions('tenant-1', {})).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 30,
      totalPages: 0,
    });
  });

  it('adjusts stock and rejects missing or insufficient stock', async () => {
    selectQueue.push([]);
    await expect(service.adjust('tenant-1', 'user-1', 'missing', 1, 'IN')).rejects.toBeInstanceOf(ConflictException);

    selectQueue.push([{ id: 'p1', stock: 3 }]);
    await expect(service.adjust('tenant-1', 'user-1', 'p1', 5, 'OUT')).rejects.toBeInstanceOf(ConflictException);

    selectQueue.push([{ id: 'p1', stock: 3 }]);
    updateQueue.push([{ id: 'p1', stock: 8 }]);
    await expect(service.adjust('tenant-1', 'user-1', 'p1', 5, 'IN', 'Nhap kho', 'PO-1')).resolves.toEqual({
      product: { id: 'p1', stock: 8 },
      previousStock: 3,
      newStock: 8,
      delta: 5,
    });

    selectQueue.push([{ id: 'p1', stock: 8 }]);
    updateQueue.push([{ id: 'p1', stock: 6 }]);
    await expect(service.adjust('tenant-1', 'user-1', 'p1', 2, 'OUT')).resolves.toMatchObject({
      previousStock: 8,
      newStock: 6,
      delta: -2,
    });
  });

  it('returns low-stock lists, summary defaults, and available stock', async () => {
    selectQueue.push([{ id: 'p1', stock: 1 }]);
    await expect(service.getLowStock('tenant-1')).resolves.toEqual([{ id: 'p1', stock: 1 }]);

    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ total_products: 4, total_units: 20, total_value: '125000.50', out_of_stock: 1, low_stock: 2 }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(service.getSummary('tenant-1')).resolves.toEqual({
      totalProducts: 4,
      totalUnits: 20,
      totalValue: 125000.5,
      outOfStock: 1,
      lowStock: 2,
    });
    await expect(service.getSummary('tenant-1')).resolves.toEqual({
      totalProducts: 0,
      totalUnits: 0,
      totalValue: 0,
      outOfStock: 0,
      lowStock: 0,
    });

    selectQueue.push([], [{ id: 'p1', stock: 10 }], [{ id: 'store-1', configJson: '{"safetyStockBuffer":2}' }], [{ sum: 3 }]);
    await expect(service.getAvailableStock('tenant-1', 'missing')).resolves.toBe(0);
    await expect(service.getAvailableStock('tenant-1', 'p1', 'store-1')).resolves.toBe(5);

    selectQueue.push([{ id: 'p2', stock: 1 }], [{ sum: 5 }]);
    await expect(service.getAvailableStock('tenant-1', 'p2')).resolves.toBe(0);

    selectQueue.push([{ id: 'p3', stock: 10 }], [{ id: 'store-2', configJson: null }], []);
    await expect(service.getAvailableStock('tenant-1', 'p3', 'store-2')).resolves.toBe(10);
  });

  it('creates, updates, releases, and consumes reservations', async () => {
    selectQueue.push([{ id: 'res-1' }]);
    updateQueue.push([{ id: 'res-1', quantityReserved: 3 }]);
    await expect(service.createReservation('tenant-1', 'store-1', 'order-1', 'p1', 3)).resolves.toEqual([
      { id: 'res-1', quantityReserved: 3 },
    ]);

    selectQueue.push([]);
    insertQueue.push([{ id: 'res-2', quantityReserved: 2 }]);
    await expect(service.createReservation('tenant-1', 'store-1', 'order-2', 'p2', 2)).resolves.toEqual([
      { id: 'res-2', quantityReserved: 2 },
    ]);

    await expect(service.releaseReservation('tenant-1', 'order-2')).resolves.toBeUndefined();

    selectQueue.push([]);
    await expect(service.consumeReservation('tenant-1', 'missing')).resolves.toBeNull();

    selectQueue.push([{ id: 'res-2', productId: 'p2', quantityReserved: 2 }]);
    await expect(service.consumeReservation('tenant-1', 'order-2')).resolves.toEqual({
      id: 'res-2',
      productId: 'p2',
      quantityReserved: 2,
    });
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('pushes stock to marketplaces and syncs every active store', async () => {
    selectQueue.push([]);
    await expect(service.pushStockToMarketplace('tenant-1', 'missing')).rejects.toThrow('Store not found');

    selectQueue.push([{ id: 'store-1', platform: 'shopify', configJson: '{}' }]);
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        { product_id: 'p1', external_id: 'ext-1', stock: 10, reserved_qty: 3, safety_buffer: 2 },
        { product_id: 'p2', external_id: 'ext-2', stock: 1, reserved_qty: 5, safety_buffer: 0 },
      ],
    });

    await expect(service.pushStockToMarketplace('tenant-1', 'store-1')).resolves.toMatchObject({
      storeId: 'store-1',
      status: 'pending_configuration',
      items: [
        { productId: 'p1', externalId: 'ext-1', available: 5 },
        { productId: 'p2', externalId: 'ext-2', available: 0 },
      ],
    });

    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    jest.spyOn(global, 'fetch').mockImplementation(fetchMock as any);
    selectQueue.push([{
      id: 'store-live',
      platform: 'shopify',
      configJson: JSON.stringify({ stockSyncEndpoint: 'https://marketplace.example/stock', apiKey: 'key-1' }),
    }]);
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        { product_id: 'p1', external_id: 'ext-1', stock: 10, reserved_qty: 1, safety_buffer: 2 },
        { product_id: 'p2', external_id: null, stock: 5, reserved_qty: 0, safety_buffer: 0 },
      ],
    });

    await expect(service.pushStockToMarketplace('tenant-1', 'store-live')).resolves.toMatchObject({
      storeId: 'store-live',
      platform: 'shopify',
      status: 'pushed',
      items: [{ productId: 'p1', externalId: 'ext-1', available: 7 }],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://marketplace.example/stock',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer key-1' }),
      }),
    );

    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    selectQueue.push([{
      id: 'store-fail-http',
      platform: 'shopify',
      configJson: JSON.stringify({ stockSyncEndpoint: 'https://marketplace.example/stock' }),
    }]);
    mockDb.execute.mockResolvedValueOnce({ rows: [] });
    await expect(service.pushStockToMarketplace('tenant-1', 'store-fail-http')).rejects.toThrow(
      'Marketplace stock sync failed with status 503',
    );

    selectQueue.push([{ id: 'store-ok' }, { id: 'store-fail' }]);
    jest.spyOn(service, 'pushStockToMarketplace')
      .mockResolvedValueOnce({ storeId: 'store-ok', items: [], pushedAt: new Date() })
      .mockRejectedValueOnce(new Error('marketplace offline'));

    await expect(service.syncAllStoresStock('tenant-1')).resolves.toEqual([
      expect.objectContaining({ status: 'success', storeId: 'store-ok' }),
      { status: 'error', error: 'marketplace offline' },
    ]);
  });
});
