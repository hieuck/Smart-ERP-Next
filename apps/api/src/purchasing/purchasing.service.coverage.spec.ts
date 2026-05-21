const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  purchaseOrders: {
    id: 'purchaseOrders.id',
    tenantId: 'purchaseOrders.tenantId',
    code: 'purchaseOrders.code',
    status: 'purchaseOrders.status',
    createdAt: 'purchaseOrders.createdAt',
  },
  purchaseOrderItems: {
    id: 'purchaseOrderItems.id',
    purchaseOrderId: 'purchaseOrderItems.purchaseOrderId',
  },
  products: {
    id: 'products.id',
    tenantId: 'products.tenantId',
  },
  inventoryTransactions: {
    productId: 'inventoryTransactions.productId',
  },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  ilike: jest.fn((field, value) => ({ op: 'ilike', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
}));

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PurchasingService } from './purchasing.service';

type SelectResponse = {
  rows: any[];
  chainAfterWhere?: boolean;
  chainAfterOrderBy?: boolean;
};

const selectQueue: Array<SelectResponse | any[]> = [];
const insertReturningQueue: any[][] = [];
const updateReturningQueue: any[][] = [];

const normalizeSelectResponse = (value: SelectResponse | any[]): SelectResponse =>
  Array.isArray(value) ? { rows: value } : value;

const makeSelectChain = (response: SelectResponse) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => (response.chainAfterWhere ? chain : Promise.resolve(response.rows))),
    orderBy: jest.fn(() => (response.chainAfterOrderBy ? chain : Promise.resolve(response.rows))),
    limit: jest.fn(() => chain),
    offset: jest.fn(() => Promise.resolve(response.rows)),
  };
  return chain;
};

const makeWriteChain = (queue: any[][]) => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(queue.shift() ?? [])),
  };
  return chain;
};

describe('PurchasingService coverage', () => {
  let service: PurchasingService;

  beforeEach(() => {
    jest.clearAllMocks();
    selectQueue.length = 0;
    insertReturningQueue.length = 0;
    updateReturningQueue.length = 0;
    service = new PurchasingService();

    mockDb.select.mockImplementation(() => makeSelectChain(normalizeSelectResponse(selectQueue.shift() ?? [])));
    mockDb.insert.mockImplementation(() => makeWriteChain(insertReturningQueue));
    mockDb.update.mockImplementation(() => makeWriteChain(updateReturningQueue));
  });

  it('creates a purchase order with generated code, calculated totals, and normalized item data', async () => {
    selectQueue.push(
      [{ id: 'p-1', name: 'Arabica beans', sku: 'BEAN-001', unit: null }],
      [{ count: 4 }],
    );
    insertReturningQueue.push([{ id: 'po-1', code: 'PN-000005', status: 'draft' }]);

    const result = await service.create('tenant-1', 'user-1', {
      supplierId: 'supplier-1',
      warehouseId: 'warehouse-1',
      expectedDate: '2026-05-25',
      notes: 'Restock',
      items: [
        {
          productId: 'p-1',
          orderedQty: 3,
          unitCost: 120000,
          taxRate: 8,
          notes: 'Green beans',
        },
      ],
    } as any);

    expect(result).toMatchObject({
      id: 'po-1',
      items: [
        expect.objectContaining({
          productId: 'p-1',
          productName: 'Arabica beans',
          productSku: 'BEAN-001',
          unit: 'piece',
          orderedQty: 3,
          receivedQty: 0,
          unitCost: '120000',
          taxRate: '8',
          lineTotal: '360000',
          notes: 'Green beans',
        }),
      ],
    });

    const poInsert = mockDb.insert.mock.results[0].value;
    expect(poInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        code: 'PN-000005',
        subtotal: '360000',
        total: '360000',
        paymentStatus: 'unpaid',
      }),
    );
  });

  it('creates purchase orders with optional defaults when fields are omitted', async () => {
    selectQueue.push(
      [{ id: 'p-default', name: 'Robusta beans', sku: 'ROB-001', unit: 'kg' }],
      [{ count: 0 }],
    );
    insertReturningQueue.push([{ id: 'po-default', code: 'PN-000001', status: 'draft' }]);

    const result = await service.create('tenant-1', 'user-1', {
      items: [{ productId: 'p-default', orderedQty: 2, unitCost: 50000 }],
    } as any);

    expect(result.items[0]).toMatchObject({
      unit: 'kg',
      taxRate: '0',
      notes: null,
      batchNumber: null,
    });

    const poInsert = mockDb.insert.mock.results[0].value;
    expect(poInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierId: null,
        warehouseId: null,
        expectedDate: null,
        notes: null,
      }),
    );
  });

  it('rejects empty or unknown products when creating purchase orders', async () => {
    await expect(service.create('tenant-1', 'user-1', { items: [] } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    selectQueue.push([]);
    await expect(
      service.create('tenant-1', 'user-1', {
        items: [{ productId: 'missing', orderedQty: 1, unitCost: 10 }],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates purchase orders from reorder suggestions using product costs', async () => {
    const createSpy = jest.spyOn(service, 'create').mockResolvedValue({ id: 'po-2' } as any);
    selectQueue.push([{ id: 'p-1', name: 'Arabica beans', sku: 'BEAN-001', cost: '45000' }]);

    await expect(
      service.createFromReorderSuggestions('tenant-1', 'user-1', {
        supplierId: 'supplier-1',
        warehouseId: 'warehouse-1',
        notes: 'Auto reorder',
        items: [{ productId: 'p-1', quantity: 4 }],
      } as any),
    ).resolves.toEqual({ id: 'po-2' });

    expect(createSpy).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
      expect.objectContaining({
        items: [expect.objectContaining({ productId: 'p-1', orderedQty: 4, unitCost: 45000, taxRate: 0 })],
      }),
    );
  });

  it('uses a zero unit cost fallback for reorder products without a usable cost', async () => {
    const createSpy = jest.spyOn(service, 'create').mockResolvedValue({ id: 'po-zero-cost' } as any);
    selectQueue.push([{ id: 'p-zero', name: 'No cost item', sku: 'ZERO', cost: null }]);

    await expect(
      service.createFromReorderSuggestions('tenant-1', 'user-1', {
        supplierId: 'supplier-1',
        items: [{ productId: 'p-zero', quantity: 1 }],
      } as any),
    ).resolves.toEqual({ id: 'po-zero-cost' });

    expect(createSpy).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
      expect.objectContaining({
        items: [expect.objectContaining({ productId: 'p-zero', unitCost: 0 })],
      }),
    );
  });

  it('rejects invalid reorder suggestions', async () => {
    await expect(
      service.createFromReorderSuggestions('tenant-1', 'user-1', { items: [] } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    selectQueue.push([]);
    await expect(
      service.createFromReorderSuggestions('tenant-1', 'user-1', {
        items: [{ productId: 'missing', quantity: 1 }],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists purchase orders with capped pagination and filters', async () => {
    selectQueue.push(
      [{ count: 35 }],
      { rows: [{ id: 'po-1' }], chainAfterWhere: true, chainAfterOrderBy: true },
    );

    await expect(
      service.findAll('tenant-1', { page: 2, limit: 250, search: 'PN-', status: 'draft' }),
    ).resolves.toEqual({
      items: [{ id: 'po-1' }],
      total: 35,
      page: 2,
      limit: 100,
      totalPages: 1,
    });
  });

  it('lists purchase orders with default pagination when no query options are provided', async () => {
    selectQueue.push(
      [{ count: 0 }],
      { rows: [], chainAfterWhere: true, chainAfterOrderBy: true },
    );

    await expect(service.findAll('tenant-1', {})).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });

  it('loads purchase order details and rejects missing records', async () => {
    selectQueue.push([{ id: 'po-1', status: 'draft' }], [{ id: 'item-1' }], []);

    await expect(service.findOne('tenant-1', 'po-1')).resolves.toMatchObject({
      id: 'po-1',
      items: [{ id: 'item-1' }],
    });
    await expect(service.findOne('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('receives goods, records inventory movement, and marks fully received orders', async () => {
    selectQueue.push(
      [{ id: 'po-1', code: 'PN-000001', status: 'confirmed' }],
      [{ id: 'item-1', productId: 'p-1', productName: 'Arabica beans', receivedQty: 1, orderedQty: 3 }],
      [{ id: 'p-1', stock: 7 }],
      [{ id: 'item-1', receivedQty: 3, orderedQty: 3 }],
    );
    updateReturningQueue.push([{ id: 'po-1', status: 'received' }]);

    await expect(
      service.receive('tenant-1', 'po-1', 'user-1', [{ itemId: 'item-1', receivedQty: 2 }]),
    ).resolves.toMatchObject({
      id: 'po-1',
      status: 'received',
      items: [{ id: 'item-1', receivedQty: 3, orderedQty: 3 }],
    });

    expect(mockDb.insert).toHaveBeenCalledWith(expect.anything());
    const productUpdate = mockDb.update.mock.results[1].value;
    expect(productUpdate.set).toHaveBeenCalledWith(expect.objectContaining({ stock: 9 }));
  });

  it('rejects invalid receiving flows', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValueOnce({ id: 'po-1', status: 'draft', items: [] } as any);
    await expect(service.receive('tenant-1', 'po-1', 'user-1', [])).rejects.toBeInstanceOf(BadRequestException);

    jest.spyOn(service, 'findOne').mockResolvedValueOnce({
      id: 'po-1',
      status: 'confirmed',
      items: [{ id: 'item-1', receivedQty: 3, orderedQty: 3, productName: 'Arabica beans' }],
    } as any);
    await expect(
      service.receive('tenant-1', 'po-1', 'user-1', [{ itemId: 'item-1', receivedQty: 1 }]),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps status when no received items match the purchase order', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValueOnce({
      id: 'po-no-match',
      code: 'PN-000010',
      status: 'confirmed',
      items: [{ id: 'known-item', productId: 'p-1', receivedQty: 0, orderedQty: 3 }],
    } as any);
    selectQueue.push([{ id: 'known-item', receivedQty: 0, orderedQty: 3 }]);
    updateReturningQueue.push([{ id: 'po-no-match', status: 'confirmed' }]);

    await expect(
      service.receive('tenant-1', 'po-no-match', 'user-1', [{ itemId: 'missing-item', receivedQty: 1 }]),
    ).resolves.toMatchObject({
      id: 'po-no-match',
      status: 'confirmed',
      items: [{ id: 'known-item', receivedQty: 0, orderedQty: 3 }],
    });

    const poUpdate = mockDb.update.mock.results[mockDb.update.mock.results.length - 1].value;
    expect(poUpdate.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed', receivedAt: null }));
  });

  it('marks purchase orders partially received without stock movement when product lookup misses', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValueOnce({
      id: 'po-partial',
      code: 'PN-000011',
      status: 'confirmed',
      items: [{ id: 'item-1', productId: 'missing-product', productName: 'Missing', receivedQty: 0, orderedQty: 5 }],
    } as any);
    selectQueue.push([], [{ id: 'item-1', receivedQty: 2, orderedQty: 5 }]);
    updateReturningQueue.push([{ id: 'po-partial', status: 'partial_received' }]);

    await expect(
      service.receive('tenant-1', 'po-partial', 'user-1', [{ itemId: 'item-1', receivedQty: 2 }]),
    ).resolves.toMatchObject({
      id: 'po-partial',
      status: 'partial_received',
      items: [{ id: 'item-1', receivedQty: 2, orderedQty: 5 }],
    });

    const poUpdate = mockDb.update.mock.results[mockDb.update.mock.results.length - 1].value;
    expect(poUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'partial_received', receivedAt: null }),
    );
  });

  it('confirms, cancels, and rejects invalid status transitions', async () => {
    updateReturningQueue.push([{ id: 'po-1', status: 'confirmed' }]);
    await expect(service.confirm('tenant-1', 'po-1')).resolves.toEqual({ id: 'po-1', status: 'confirmed' });

    selectQueue.push([{ id: 'po-1', status: 'draft' }]);
    updateReturningQueue.push([{ id: 'po-1', status: 'cancelled' }]);
    await expect(service.cancel('tenant-1', 'po-1')).resolves.toEqual({ id: 'po-1', status: 'cancelled' });

    selectQueue.push([], [{ id: 'po-2', status: 'received' }]);
    await expect(service.cancel('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.cancel('tenant-1', 'po-2')).rejects.toBeInstanceOf(BadRequestException);

    updateReturningQueue.push([]);
    await expect(service.confirm('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
