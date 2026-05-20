const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  execute: jest.fn(),
};

jest.mock("@smart-erp/database", () => ({ db: mockDb }));

jest.mock("@smart-erp/database/schema", () => ({
  products: {
    id: "products.id",
    tenantId: "products.tenantId",
    name: "products.name",
    sku: "products.sku",
    price: "products.price",
    category: "products.category",
    categoryId: "products.categoryId",
    isActive: "products.isActive",
    createdAt: "products.createdAt",
  },
  inventoryTransactions: {
    tenantId: "inventoryTransactions.tenantId",
    productId: "inventoryTransactions.productId",
    createdAt: "inventoryTransactions.createdAt",
  },
  productCategories: {
    id: "productCategories.id",
    tenantId: "productCategories.tenantId",
    name: "productCategories.name",
    isActive: "productCategories.isActive",
    sortOrder: "productCategories.sortOrder",
  },
}));

jest.mock("@smart-erp/database/drizzle", () => ({
  eq: jest.fn((field, value) => ({ op: "eq", field, value })),
  and: jest.fn((...conditions) => ({ op: "and", conditions })),
  ilike: jest.fn((field, value) => ({ op: "ilike", field, value })),
  or: jest.fn((...conditions) => ({ op: "or", conditions })),
  gte: jest.fn((field, value) => ({ op: "gte", field, value })),
  lte: jest.fn((field, value) => ({ op: "lte", field, value })),
  desc: jest.fn((field) => ({ op: "desc", field })),
  sql: jest.fn((strings, ...values) => ({ strings, values })),
}));

import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ProductsService } from "./products.service";

type SelectResponse = {
  rows: any[];
  chainAfterWhere?: boolean;
  chainAfterOrderBy?: boolean;
};

const selectQueue: SelectResponse[] = [];
const insertReturningQueue: any[][] = [];
const updateReturningQueue: any[][] = [];
const deleteReturningQueue: any[][] = [];

const normalizeSelectResponse = (value: any): SelectResponse =>
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

const createService = () => {
  const activityService = { log: jest.fn().mockResolvedValue(undefined) };
  return {
    activityService,
    service: new ProductsService(activityService as any),
  };
};

describe("ProductsService coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectQueue.length = 0;
    insertReturningQueue.length = 0;
    updateReturningQueue.length = 0;
    deleteReturningQueue.length = 0;

    mockDb.select.mockImplementation(() => makeSelectChain(normalizeSelectResponse(selectQueue.shift() ?? [])));
    mockDb.insert.mockImplementation(() => makeWriteChain(insertReturningQueue));
    mockDb.update.mockImplementation(() => makeWriteChain(updateReturningQueue));
    mockDb.delete.mockImplementation(() => makeWriteChain(deleteReturningQueue));
    mockDb.execute.mockResolvedValue({ rows: [] });
  });

  it("creates products with normalized SKU, cleaned image URL, category text, and activity log", async () => {
    const { service, activityService } = createService();
    const product = {
      id: "p-1",
      name: "Cafe sua da",
      sku: "CAFE-001",
    };
    selectQueue.push([]);
    insertReturningQueue.push([product]);

    await expect(
      service.create(
        "tenant-1",
        {
          name: "Cafe sua da",
          sku: "cafe-001",
          category: "Do uong",
          imageUrl: "   ",
          price: 25000,
          cost: 12000,
          stock: 10,
        } as any,
        "user-1",
      ),
    ).resolves.toBe(product);

    const insertChain = mockDb.insert.mock.results[0].value;
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        sku: "CAFE-001",
        categoryId: null,
        category: "Do uong",
        imageUrl: null,
        price: "25000",
        cost: "12000",
        stock: 10,
        isActive: true,
      }),
    );
    expect(activityService.log).toHaveBeenCalledWith(
      "tenant-1",
      "user-1",
      "created",
      "product",
      "p-1",
      { name: "Cafe sua da", sku: "CAFE-001" },
    );
  });

  it("rejects duplicate requested SKU values", async () => {
    const { service } = createService();
    selectQueue.push([{ id: "other-product" }]);

    await expect(
      service.create("tenant-1", { name: "Phone", sku: "phone-1", price: 1 } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("finds translated products and rejects missing products", async () => {
    const { service } = createService();
    const product = {
      id: "p-1",
      description: "English",
      translations: { vi: { description: "Tiếng Việt" } },
    };
    selectQueue.push([product], []);

    await expect(service.findOne("tenant-1", "p-1", "vi")).resolves.toMatchObject({
      id: "p-1",
      description: "Tiếng Việt",
    });
    await expect(service.findOne("tenant-1", "missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("paginates product lists and applies bounded limits", async () => {
    const { service } = createService();
    selectQueue.push(
      [{ count: 35 }],
      { rows: [{ id: "p-2" }], chainAfterWhere: true, chainAfterOrderBy: true },
    );

    await expect(
      service.findAll("tenant-1", {
        page: 2,
        limit: 200,
        search: "mac",
        minPrice: 1000,
        maxPrice: 5000,
        isActive: true,
        category: "Laptop",
      } as any),
    ).resolves.toEqual({
      items: [{ id: "p-2" }],
      total: 35,
      page: 2,
      limit: 100,
      totalPages: 1,
    });
  });

  it("returns active categories plus legacy category names", async () => {
    const { service } = createService();
    selectQueue.push({ rows: [{ id: "cat-1", name: "Phones" }], chainAfterWhere: true });
    mockDb.execute.mockResolvedValue({ rows: [{ name: "Legacy" }] });

    await expect(service.findCategories("tenant-1")).resolves.toEqual({
      items: [{ id: "cat-1", name: "Phones" }],
      legacy: [{ name: "Legacy" }],
    });
  });

  it("updates SKU, category, price fields and logs changes", async () => {
    const { service, activityService } = createService();
    selectQueue.push([{ id: "cat-1", name: "Phones" }], []);
    updateReturningQueue.push([{ id: "p-1", sku: "IPHONE-15" }]);

    await expect(
      service.update(
        "tenant-1",
        "p-1",
        {
          name: "iPhone 15",
          sku: "iphone-15",
          categoryId: "cat-1",
          imageUrl: "",
          price: 32000000,
          cost: 28000000,
        } as any,
        "user-1",
      ),
    ).resolves.toEqual({ id: "p-1", sku: "IPHONE-15" });

    const updateChain = mockDb.update.mock.results[0].value;
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "iPhone 15",
        sku: "IPHONE-15",
        categoryId: "cat-1",
        category: "Phones",
        imageUrl: null,
        price: "32000000",
        cost: "28000000",
        updatedAt: expect.any(Date),
      }),
    );
    expect(activityService.log).toHaveBeenCalledWith(
      "tenant-1",
      "user-1",
      "updated",
      "product",
      "p-1",
      { changes: ["name", "sku", "categoryId", "imageUrl", "price", "cost"] },
    );
  });

  it("rejects unknown category ids and missing update targets", async () => {
    const { service } = createService();
    selectQueue.push([]);
    await expect(service.update("tenant-1", "p-1", { categoryId: "missing" } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    updateReturningQueue.push([]);
    await expect(service.update("tenant-1", "p-1", { name: "Missing" } as any)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("removes products and logs deletion activity", async () => {
    const { service, activityService } = createService();
    deleteReturningQueue.push([{ id: "p-1", name: "Phone", sku: "P-1" }]);

    await expect(service.remove("tenant-1", "p-1", "user-1")).resolves.toEqual({
      id: "p-1",
      name: "Phone",
      sku: "P-1",
    });
    expect(activityService.log).toHaveBeenCalledWith(
      "tenant-1",
      "user-1",
      "deleted",
      "product",
      "p-1",
      { name: "Phone", sku: "P-1" },
    );

    deleteReturningQueue.push([]);
    await expect(service.remove("tenant-1", "missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("adjusts stock, writes inventory transactions, and rejects negative stock", async () => {
    const { service, activityService } = createService();
    selectQueue.push([{ id: "p-1", stock: 10 }]);
    updateReturningQueue.push([{ id: "p-1", stock: 7 }]);

    await expect(
      service.adjustStock("tenant-1", "p-1", 3, "OUT", "sold", "SO-1", "user-1"),
    ).resolves.toEqual({ id: "p-1", stock: 7 });

    const inventoryInsertChain = mockDb.insert.mock.results[0].value;
    expect(inventoryInsertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        productId: "p-1",
        type: "OUT",
        quantity: 3,
        previousStock: 10,
        newStock: 7,
        reference: "SO-1",
        notes: "sold",
        createdBy: "user-1",
      }),
    );
    expect(activityService.log).toHaveBeenCalledWith(
      "tenant-1",
      "user-1",
      "stock_adjusted",
      "product",
      "p-1",
      expect.objectContaining({ type: "OUT", quantity: 3, previousStock: 10, newStock: 7 }),
    );

    selectQueue.push([{ id: "p-1", stock: 1 }]);
    await expect(service.adjustStock("tenant-1", "p-1", 2, "OUT")).rejects.toBeInstanceOf(ConflictException);
  });

  it("validates CSV headers during import", async () => {
    const { service } = createService();

    await expect(service.importFromCsv("tenant-1", Buffer.from("sku,name\nA,Item"))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.importFromCsv("tenant-1", Buffer.from("sku,name,price\n"))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
