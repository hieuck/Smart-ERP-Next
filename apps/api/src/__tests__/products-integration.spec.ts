jest.mock('@smart-erp/database', () => {
  const db: any = () => db;
  const chainFn = jest.fn(() => db);

  db.select = chainFn;
  db.from = chainFn;
  db.where = chainFn;
  db.orderBy = chainFn;
  db.limit = chainFn;
  db.offset = chainFn;
  db.insert = chainFn;
  db.values = chainFn;
  db.update = chainFn;
  db.set = chainFn;
  db.delete = chainFn;
  db.execute = jest.fn();
  db.returning = jest.fn();
  db.then = jest.fn();
  db.innerJoin = chainFn;
  db.leftJoin = chainFn;
  db.groupBy = chainFn;

  return { db };
});
jest.mock('@smart-erp/database/schema', () => ({ products: {}, inventoryTransactions: {}, productCategories: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  or: jest.fn(),
  ilike: jest.fn(),
  sql: jest.fn(),
  gte: jest.fn(),
  lte: jest.fn(),
  desc: jest.fn(),
}));

import { db } from '@smart-erp/database';
import { ProductsService } from '../products/products.service';

describe('ProductsService (direct instantiation)', () => {
  let service: ProductsService;
  const mockActivityService = { log: jest.fn() };
  const TENANT_ID = 'tenant-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (db as any).then.mockImplementation((resolve: any) => resolve([]));
    (db as any).returning.mockReset();
    (db as any).execute.mockReset();
    mockActivityService.log.mockResolvedValue(undefined);
    service = new ProductsService(mockActivityService as any);
  });

  describe('create', () => {
    const baseDto: any = { name: 'Test Product', price: 100, sku: 'TP-001' };

    it('creates and returns a product with provided SKU', async () => {
      const expected: any = {
        id: 'p-1', tenantId: TENANT_ID, name: 'Test Product', price: '100', sku: 'TP-001',
        cost: null, stock: 0, isActive: true, categoryId: null, category: null,
        imageUrl: null, description: null, unit: null,
      };
      (db as any).returning.mockResolvedValue([expected]);

      const result = await service.create(TENANT_ID, baseDto);

      expect(result).toEqual(expected);
      expect(db.insert).toHaveBeenCalled();
    });

    it('creates and returns a product with auto-generated SKU', async () => {
      const dto: any = { name: 'My Item', price: 50 };
      (db as any).returning.mockResolvedValue([{ id: 'p-auto' }]);

      await service.create(TENANT_ID, dto);

      expect((db as any).values).toHaveBeenCalledWith(
        expect.objectContaining({ sku: expect.stringContaining('MY-ITEM') }),
      );
    });

    it('throws ConflictException when SKU already exists', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([{ id: 'existing' }]));

      await expect(service.create(TENANT_ID, baseDto))
        .rejects.toThrow('SKU already exists');
    });

    it('throws BadRequestException when categoryId does not exist', async () => {
      await expect(service.create(TENANT_ID, { ...baseDto, categoryId: 'cat-missing' }))
        .rejects.toThrow('Product category not found');
    });

    it('logs activity when userId is provided', async () => {
      const product: any = { id: 'p-1', name: 'Test Product', sku: 'TP-001' };
      (db as any).returning.mockResolvedValue([{ ...product, tenantId: TENANT_ID, price: '100' }]);

      await service.create(TENANT_ID, baseDto, 'user-1');

      expect(mockActivityService.log).toHaveBeenCalledWith(
        TENANT_ID, 'user-1', 'created', 'product', 'p-1',
        { name: 'Test Product', sku: 'TP-001' },
      );
    });
  });

  describe('findAll', () => {
    const products = [
      { id: 'p-1', name: 'Alpha', sku: 'A', tenantId: TENANT_ID, price: '10', isActive: true, stock: 5 },
      { id: 'p-2', name: 'Beta', sku: 'B', tenantId: TENANT_ID, price: '20', isActive: true, stock: 3 },
    ];

    it('returns paginated products list', async () => {
      (db as any).then
        .mockImplementationOnce((resolve: any) => resolve([{ count: 2 }]))
        .mockImplementationOnce((resolve: any) => resolve(products));

      const result = await service.findAll(TENANT_ID, {} as any);

      expect(result.items).toEqual(products);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('filters by search term', async () => {
      const filtered = [products[0]];
      (db as any).then
        .mockImplementationOnce((resolve: any) => resolve([{ count: 1 }]))
        .mockImplementationOnce((resolve: any) => resolve(filtered));

      const result = await service.findAll(TENANT_ID, { search: 'Alp' } as any);

      expect(result.items).toEqual(filtered);
    });

    it('filters by isActive', async () => {
      (db as any).then
        .mockImplementationOnce((resolve: any) => resolve([{ count: 0 }]))
        .mockImplementationOnce((resolve: any) => resolve([]));

      const result = await service.findAll(TENANT_ID, { isActive: false } as any);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('filters by price range', async () => {
      (db as any).then
        .mockImplementationOnce((resolve: any) => resolve([{ count: 1 }]))
        .mockImplementationOnce((resolve: any) => resolve([products[1]]));

      const result = await service.findAll(TENANT_ID, { minPrice: 15, maxPrice: 25 } as any);

      expect(result.items).toEqual([products[1]]);
    });

    it('applies max limit of 100', async () => {
      (db as any).then
        .mockImplementationOnce((resolve: any) => resolve([{ count: 0 }]))
        .mockImplementationOnce((resolve: any) => resolve([]));

      const result = await service.findAll(TENANT_ID, { limit: 200 } as any);

      expect(result.limit).toBe(100);
    });
  });

  describe('findAllForExport', () => {
    it('returns all matching products', async () => {
      const items = [
        { id: 'p-1', name: 'Export', sku: 'E001', tenantId: TENANT_ID, price: '10' },
      ];
      (db as any).then.mockImplementation((resolve: any) => resolve(items));

      const result = await service.findAllForExport(TENANT_ID, { search: 'Export' } as any);

      expect(result).toEqual(items);
    });
  });

  describe('findOne', () => {
    const product: any = { id: 'p-1', name: 'Item', sku: 'SKU-1', tenantId: TENANT_ID, price: '100', stock: 10 };

    it('returns a product by id within tenant', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([product]));

      const result = await service.findOne(TENANT_ID, 'p-1');

      expect(result).toEqual(product);
    });

    it('throws NotFoundException when not found', async () => {
      await expect(service.findOne(TENANT_ID, 'missing'))
        .rejects.toThrow('Product not found');
    });

    it('returns translated description when lang matches translations', async () => {
      const prodWithTrans: any = {
        ...product,
        translations: { vi: { description: 'Mô tả tiếng Việt' } },
      };
      (db as any).then.mockImplementation((resolve: any) => resolve([prodWithTrans]));

      const result = await service.findOne(TENANT_ID, 'p-1', 'vi');

      expect(result.description).toBe('Mô tả tiếng Việt');
    });
  });

  describe('findBySku', () => {
    const product: any = { id: 'p-1', name: 'Item', sku: 'SKU-001', tenantId: TENANT_ID, price: '100' };

    it('returns a product by SKU within tenant', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([product]));

      const result = await service.findBySku(TENANT_ID, 'SKU-001');

      expect(result).toEqual(product);
    });

    it('throws NotFoundException when SKU not found', async () => {
      await expect(service.findBySku(TENANT_ID, 'NONEXIST'))
        .rejects.toThrow('Product not found');
    });
  });

  describe('update', () => {
    const product: any = { id: 'p-1', name: 'Original', sku: 'ORIG', tenantId: TENANT_ID, price: '100' };

    it('updates and returns the product', async () => {
      const updated: any = { ...product, name: 'Updated' };
      (db as any).returning.mockResolvedValue([updated]);

      const result = await service.update(TENANT_ID, 'p-1', { name: 'Updated' } as any);

      expect(result).toEqual(updated);
    });

    it('updates SKU when provided', async () => {
      const updated: any = { ...product, sku: 'NEW-SKU' };
      (db as any).returning.mockResolvedValue([updated]);

      const result = await service.update(TENANT_ID, 'p-1', { sku: 'NEW-SKU' } as any);

      expect(result.sku).toBe('NEW-SKU');
    });

    it('throws NotFoundException when product not found', async () => {
      (db as any).returning.mockResolvedValue([]);

      await expect(service.update(TENANT_ID, 'missing', { name: 'Nope' } as any))
        .rejects.toThrow('Product not found');
    });

    it('logs activity when userId is provided', async () => {
      const updated: any = { ...product, name: 'Updated' };
      (db as any).returning.mockResolvedValue([updated]);

      await service.update(TENANT_ID, 'p-1', { name: 'Updated' } as any, 'user-1');

      expect(mockActivityService.log).toHaveBeenCalledWith(
        TENANT_ID, 'user-1', 'updated', 'product', 'p-1',
        { changes: ['name'] },
      );
    });
  });

  describe('remove', () => {
    const product: any = { id: 'p-1', name: 'Gone', sku: 'DEL', tenantId: TENANT_ID, price: '50' };

    it('deletes and returns the product', async () => {
      (db as any).returning.mockResolvedValue([product]);

      const result = await service.remove(TENANT_ID, 'p-1');

      expect(result).toEqual(product);
    });

    it('throws NotFoundException when product not found', async () => {
      (db as any).returning.mockResolvedValue([]);

      await expect(service.remove(TENANT_ID, 'missing'))
        .rejects.toThrow('Product not found');
    });

    it('logs activity when userId is provided', async () => {
      (db as any).returning.mockResolvedValue([product]);

      await service.remove(TENANT_ID, 'p-1', 'user-1');

      expect(mockActivityService.log).toHaveBeenCalledWith(
        TENANT_ID, 'user-1', 'deleted', 'product', 'p-1',
        { name: 'Gone', sku: 'DEL' },
      );
    });
  });

  describe('adjustStock', () => {
    const product: any = { id: 'p-1', name: 'Item', sku: 'I-1', tenantId: TENANT_ID, price: '100', stock: 10 };

    it('increases stock for IN type', async () => {
      (db as any).then.mockImplementationOnce((resolve: any) => resolve([{ ...product }]));
      (db as any).then.mockImplementationOnce((resolve: any) => resolve(undefined));
      (db as any).returning.mockResolvedValue([{ ...product, stock: 15 }]);

      const result = await service.adjustStock(TENANT_ID, 'p-1', 5, 'IN');

      expect(result.stock).toBe(15);
    });

    it('decreases stock for OUT type', async () => {
      (db as any).then.mockImplementationOnce((resolve: any) => resolve([{ ...product }]));
      (db as any).then.mockImplementationOnce((resolve: any) => resolve(undefined));
      (db as any).returning.mockResolvedValue([{ ...product, stock: 7 }]);

      const result = await service.adjustStock(TENANT_ID, 'p-1', 3, 'OUT');

      expect(result.stock).toBe(7);
    });

    it('throws ConflictException for insufficient stock on OUT', async () => {
      (db as any).then.mockImplementationOnce((resolve: any) => resolve([{ ...product }]));

      await expect(service.adjustStock(TENANT_ID, 'p-1', 20, 'OUT'))
        .rejects.toThrow('Insufficient stock');
    });

    it('handles ADJUSTMENT type', async () => {
      (db as any).then.mockImplementationOnce((resolve: any) => resolve([{ ...product }]));
      (db as any).then.mockImplementationOnce((resolve: any) => resolve(undefined));
      (db as any).returning.mockResolvedValue([{ ...product, stock: 20 }]);

      const result = await service.adjustStock(TENANT_ID, 'p-1', 10, 'ADJUSTMENT');

      expect(result.stock).toBe(20);
    });

    it('logs activity when createdBy is provided', async () => {
      (db as any).then.mockImplementationOnce((resolve: any) => resolve([{ ...product }]));
      (db as any).then.mockImplementationOnce((resolve: any) => resolve(undefined));
      (db as any).returning.mockResolvedValue([{ ...product, stock: 15 }]);

      await service.adjustStock(TENANT_ID, 'p-1', 5, 'IN', 'note', 'ref', 'user-1');

      expect(mockActivityService.log).toHaveBeenCalledWith(
        TENANT_ID, 'user-1', 'stock_adjusted', 'product', 'p-1',
        expect.objectContaining({ type: 'IN', quantity: 5 }),
      );
    });
  });

  describe('findCategories', () => {
    it('returns categories items and legacy entries', async () => {
      const categories: any = [{ id: 'cat-1', name: 'Category 1', tenantId: TENANT_ID, isActive: true }];
      (db as any).then.mockImplementation((resolve: any) => resolve(categories));
      (db as any).execute.mockResolvedValue({ rows: [{ name: 'Legacy' }] });

      const result = await service.findCategories(TENANT_ID);

      expect(result.items).toEqual(categories);
      expect(result.legacy).toEqual([{ name: 'Legacy' }]);
    });
  });

  describe('getTransactions', () => {
    it('returns transactions for a product', async () => {
      const transactions: any = [
        { id: 't-1', productId: 'p-1', type: 'IN', quantity: 5 },
      ];
      (db as any).then.mockImplementation((resolve: any) => resolve(transactions));

      const result = await service.getTransactions(TENANT_ID, 'p-1');

      expect(result).toEqual(transactions);
    });
  });
});
