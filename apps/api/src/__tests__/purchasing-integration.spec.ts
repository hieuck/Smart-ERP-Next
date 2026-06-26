import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

jest.mock('@smart-erp/database', () => ({
  db: { select: jest.fn(), insert: jest.fn(), update: jest.fn() },
}));
jest.mock('@smart-erp/database/schema', () => ({
  purchaseOrders: {},
  purchaseOrderItems: {},
  products: {},
  inventoryTransactions: {},
}));
jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  ilike: jest.fn(),
  sql: jest.fn(),
  desc: jest.fn(),
  inArray: jest.fn(),
}));

import { db } from '@smart-erp/database';
import { PurchasingService } from '../purchasing/purchasing.service';

function queryBuilder(result: any) {
  const chain: any = {};
  chain.from = jest.fn();
  chain.where = jest.fn();
  chain.orderBy = jest.fn();
  chain.limit = jest.fn();
  chain.offset = jest.fn();
  chain.then = (resolve: Function) => resolve(result);
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.offset.mockReturnValue(chain);
  return chain;
}

function mockUpdate(returningValue?: any) {
  const whereResult = returningValue
    ? { returning: jest.fn().mockResolvedValue(returningValue) }
    : {};
  return {
    set: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue(whereResult) }),
  };
}

function mockInsert(returningValue: any) {
  return {
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue(returningValue),
    }),
  };
}

describe('PurchasingService', () => {
  let service: PurchasingService;
  const tenantId = 'tenant-1';
  const userId = 'user-1';
  const poId = 'po-1';
  const productId = 'prod-1';
  const supplierId = 'supp-1';
  const warehouseId = 'wh-1';
  const itemId = 'item-1';

  const mockProduct = {
    id: productId,
    tenantId,
    name: 'Test Product',
    sku: 'TST-001',
    unit: 'piece',
    cost: '15.50',
    stock: 100,
    price: '25.00',
  };

  const mockPO = {
    id: poId,
    tenantId,
    code: 'PN-000001',
    supplierId,
    warehouseId,
    createdBy: userId,
    status: 'draft',
    subtotal: '31.00',
    discountAmount: '0',
    taxAmount: '0',
    total: '31.00',
    paidAmount: '0',
    paymentStatus: 'unpaid',
    expectedDate: null,
    receivedAt: null,
    notes: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockPOItem = {
    id: itemId,
    purchaseOrderId: poId,
    productId,
    productName: 'Test Product',
    productSku: 'TST-001',
    unit: 'piece',
    orderedQty: 2,
    receivedQty: 0,
    unitCost: '15.50',
    taxRate: '0',
    lineTotal: '31.00',
    batchNumber: null,
    expiryDate: null,
    notes: null,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new (PurchasingService as any)();
  });

  describe('create', () => {
    const dto = {
      supplierId,
      warehouseId,
      items: [{ productId, orderedQty: 2, unitCost: 15.5, taxRate: 0 }],
    };

    it('throws when dto has no items', async () => {
      await expect(service.create(tenantId, userId, { items: [] } as any))
        .rejects.toThrow(BadRequestException);
    });

    it('throws when some products are not found', async () => {
      // 1st db.select: product lookup (product query before generateCode)
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([]))
        .mockReturnValueOnce(queryBuilder([{ count: 5 }]));

      await expect(service.create(tenantId, userId, dto))
        .rejects.toThrow(BadRequestException);
    });

    it('creates a purchase order successfully', async () => {
      // 1st: product lookup, 2nd: generateCode count query
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([mockProduct]))
        .mockReturnValueOnce(queryBuilder([{ count: 0 }]));

      (db.insert as jest.Mock)
        .mockReturnValueOnce(mockInsert([{ ...mockPO, code: 'PN-000001' }]))
        .mockReturnValueOnce(mockInsert([mockPOItem]));

      const result = await service.create(tenantId, userId, dto);

      expect(result).toMatchObject({
        code: 'PN-000001',
        status: 'draft',
        items: expect.arrayContaining([
          expect.objectContaining({
            productId,
            orderedQty: 2,
            unitCost: '15.5',
            lineTotal: '31',
            productName: 'Test Product',
            productSku: 'TST-001',
          }),
        ]),
      });
    });
  });

  describe('createFromReorderSuggestions', () => {
    const dto = {
      supplierId,
      warehouseId,
      items: [{ productId, quantity: 5 }],
    };

    it('throws when dto has no items', async () => {
      await expect(
        service.createFromReorderSuggestions(tenantId, userId, { items: [] } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when a product is not found in reorder', async () => {
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([]));

      await expect(
        service.createFromReorderSuggestions(tenantId, userId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates PO from reorder suggestions successfully', async () => {
      // 1st: product lookup in createFromReorderSuggestions
      // 2nd: product lookup in this.create()
      // 3rd: generateCode count query
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([mockProduct]))
        .mockReturnValueOnce(queryBuilder([mockProduct]))
        .mockReturnValueOnce(queryBuilder([{ count: 3 }]));

      (db.insert as jest.Mock)
        .mockReturnValueOnce(mockInsert([{ ...mockPO, code: 'PN-000004' }]))
        .mockReturnValueOnce(mockInsert([mockPOItem]));

      const result = await service.createFromReorderSuggestions(tenantId, userId, dto);

      expect(result).toMatchObject({ code: 'PN-000004', status: 'draft' });
    });
  });

  describe('findAll', () => {
    it('returns paginated results with defaults', async () => {
      // 1st: count query, 2nd: items query
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([{ count: 25 }]))
        .mockReturnValueOnce(queryBuilder([mockPO]));

      const result = await service.findAll(tenantId, {});

      expect(result).toEqual({
        items: [mockPO],
        total: 25,
        page: 1,
        limit: 20,
        totalPages: 2,
      });
    });

    it('applies search and status filters', async () => {
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([{ count: 1 }]))
        .mockReturnValueOnce(queryBuilder([mockPO]));

      const result = await service.findAll(tenantId, { search: 'PN-000001', status: 'draft' });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('enforces max limit of 100', async () => {
      const manyPOs = Array.from({ length: 100 }, (_, i) => ({ ...mockPO, id: `po-${i}` }));

      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([{ count: 500 }]))
        .mockReturnValueOnce(queryBuilder(manyPOs));

      const result = await service.findAll(tenantId, { page: 1, limit: 999 });

      expect(result.limit).toBe(100);
      expect(result.items).toHaveLength(100);
    });

    it('returns empty array when no results', async () => {
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([{ count: 0 }]))
        .mockReturnValueOnce(queryBuilder([]));

      const result = await service.findAll(tenantId, { page: 99 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('findOne', () => {
    it('returns a purchase order with items', async () => {
      // 1st: PO query, 2nd: items query
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([mockPO]))
        .mockReturnValueOnce(queryBuilder([mockPOItem]));

      const result = await service.findOne(tenantId, poId);

      expect(result).toMatchObject({ id: poId, code: 'PN-000001', status: 'draft' });
      expect(result.items).toHaveLength(1);
    });

    it('throws NotFoundException when PO does not exist', async () => {
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([]));

      await expect(service.findOne(tenantId, poId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('confirm', () => {
    it('sets status to confirmed', async () => {
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ ...mockPO, status: 'confirmed' }]),
          }),
        }),
      });

      const result = await service.confirm(tenantId, poId);

      expect(result.status).toBe('confirmed');
    });

    it('throws NotFoundException when PO does not exist', async () => {
      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.confirm(tenantId, 'nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('receive', () => {
    const confirmedPO = { ...mockPO, status: 'confirmed' };
    const draftPO = { ...mockPO, status: 'draft' };
    const itemOrdered2 = { ...mockPOItem, orderedQty: 2 };
    const twoItems = [
      { ...mockPOItem, id: 'item-a', orderedQty: 10, receivedQty: 0 },
      { ...mockPOItem, id: 'item-b', orderedQty: 5, receivedQty: 0 },
    ];
    const partialItems = [
      { ...mockPOItem, id: 'item-a', orderedQty: 10, receivedQty: 4 },
      { ...mockPOItem, id: 'item-b', orderedQty: 5, receivedQty: 0 },
    ];
    const fullItems = [
      { ...mockPOItem, id: 'item-a', orderedQty: 10, receivedQty: 10 },
      { ...mockPOItem, id: 'item-b', orderedQty: 5, receivedQty: 5 },
    ];

    it('throws when PO status is draft', async () => {
      // findOne: PO query + items query
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([draftPO]))
        .mockReturnValueOnce(queryBuilder([itemOrdered2]));

      await expect(
        service.receive(tenantId, poId, userId, [{ itemId, receivedQty: 2 }]),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when received qty exceeds ordered qty', async () => {
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([confirmedPO]))
        .mockReturnValueOnce(queryBuilder([itemOrdered2]));

      await expect(
        service.receive(tenantId, poId, userId, [{ itemId, receivedQty: 999 }]),
      ).rejects.toThrow(ConflictException);
    });

    it('receives goods partially (1 item)', async () => {
      // findOne: PO + items = 2 selects
      // loop (1 item): product lookup = 1 select
      // after loop: updated items = 1 select
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([confirmedPO]))
        .mockReturnValueOnce(queryBuilder(twoItems))
        .mockReturnValueOnce(queryBuilder([mockProduct]))
        .mockReturnValueOnce(queryBuilder(partialItems));

      // loop (1 item): update orderItems + update product stock = 2
      // after loop: update PO status = 1
      (db.update as jest.Mock)
        .mockReturnValueOnce(mockUpdate())
        .mockReturnValueOnce(mockUpdate())
        .mockReturnValueOnce(mockUpdate([{ ...confirmedPO, status: 'partial_received' }]));

      // loop (1 item): insert inventory transaction = 1
      (db.insert as jest.Mock)
        .mockReturnValueOnce(mockInsert([]));

      const result = await service.receive(tenantId, poId, userId, [
        { itemId: 'item-a', receivedQty: 4 },
      ]);

      expect(result.status).toBe('partial_received');
    });

    it('receives goods fully (2 items)', async () => {
      // findOne: PO + items = 2 selects
      // loop (2 items): 2 product lookups = 2 selects
      // after loop: updated items = 1 select
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([confirmedPO]))
        .mockReturnValueOnce(queryBuilder(twoItems))
        .mockReturnValueOnce(queryBuilder([mockProduct]))
        .mockReturnValueOnce(queryBuilder([mockProduct]))
        .mockReturnValueOnce(queryBuilder(fullItems));

      // loop (2 items): 2×(update orderItems + update products) = 4
      // after loop: update PO status = 1
      (db.update as jest.Mock)
        .mockReturnValueOnce(mockUpdate())
        .mockReturnValueOnce(mockUpdate())
        .mockReturnValueOnce(mockUpdate())
        .mockReturnValueOnce(mockUpdate())
        .mockReturnValueOnce(mockUpdate([{ ...confirmedPO, status: 'received' }]));

      // loop (2 items): 2 inventory transactions = 2
      (db.insert as jest.Mock)
        .mockReturnValueOnce(mockInsert([]))
        .mockReturnValueOnce(mockInsert([]));

      const result = await service.receive(tenantId, poId, userId, [
        { itemId: 'item-a', receivedQty: 10 },
        { itemId: 'item-b', receivedQty: 5 },
      ]);

      expect(result.status).toBe('received');
    });

    it('skips unknown item ids silently', async () => {
      // findOne: PO + items = 2 selects
      // after loop: updated items = 1 select
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([confirmedPO]))
        .mockReturnValueOnce(queryBuilder(twoItems))
        .mockReturnValueOnce(queryBuilder(partialItems));

      // only PO status update (unknown item is skipped in loop)
      (db.update as jest.Mock)
        .mockReturnValueOnce(mockUpdate([{ ...confirmedPO, status: 'partial_received' }]));

      const result = await service.receive(tenantId, poId, userId, [
        { itemId: 'nonexistent-item', receivedQty: 5 },
      ]);

      expect(result.status).toBe('partial_received');
    });
  });

  describe('cancel', () => {
    it('cancels a draft PO', async () => {
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([mockPO]));

      (db.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ ...mockPO, status: 'cancelled' }]),
          }),
        }),
      });

      const result = await service.cancel(tenantId, poId);

      expect(result.status).toBe('cancelled');
    });

    it('throws NotFoundException when PO does not exist', async () => {
      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([]));

      await expect(service.cancel(tenantId, 'nonexistent'))
        .rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when PO is already received', async () => {
      const receivedPO = { ...mockPO, status: 'received' };

      (db.select as jest.Mock)
        .mockReturnValueOnce(queryBuilder([receivedPO]));

      await expect(service.cancel(tenantId, poId))
        .rejects.toThrow(BadRequestException);
    });
  });
});
