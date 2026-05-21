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

const selectQueue: Array<SelectResponse | any[]> = [];
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
        categoryId: "cat-1",
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

    selectQueue.push(
      [{ count: 0 }],
      { rows: [], chainAfterWhere: true, chainAfterOrderBy: true },
    );
    await expect(service.findAll("tenant-1", {} as any)).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
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

  it("exports products with every supported filter", async () => {
    const { service } = createService();
    selectQueue.push({ rows: [{ id: "p-1" }], chainAfterWhere: true });

    await expect(
      service.findAllForExport("tenant-1", {
        category: "Coffee",
        categoryId: "cat-1",
        isActive: false,
        maxPrice: 50000,
        minPrice: 10000,
        search: "arabica",
      } as any),
    ).resolves.toEqual([{ id: "p-1" }]);

    const selectChain = mockDb.select.mock.results[0].value;
    expect(selectChain.orderBy).toHaveBeenCalledWith("products.name");
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

  it("generates accent-normalized SKUs when none is provided", async () => {
    const { service } = createService();
    selectQueue.push([{ id: "existing-sku" }], []);
    insertReturningQueue.push([{ id: "p-1", name: "Cafe sua da", sku: "generated" }]);

    await expect(
      service.create("tenant-abc-123", { name: "Cà phê sữa đá đặc biệt", price: 25000 } as any),
    ).resolves.toEqual({ id: "p-1", name: "Cafe sua da", sku: "generated" });

    const insertChain = mockDb.insert.mock.results[0].value;
    expect(insertChain.values.mock.calls[0][0].sku).toMatch(/^CA-PHE-SUA-A-TENANT-\d{6}-0002$/);
  });

  it("fails clearly when automatic SKU generation exhausts all candidates", async () => {
    const { service } = createService();
    mockDb.select.mockImplementation(() => makeSelectChain({ rows: [{ id: "existing-sku" }] }));

    await expect((service as any).resolveSku("tenant-1", undefined, "Item")).rejects.toBeInstanceOf(ConflictException);
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

  it("updates generated SKU without a replacement name and skips optional activity logging", async () => {
    const { service, activityService } = createService();
    selectQueue.push([]);
    updateReturningQueue.push([{ id: "p-1", sku: "NEW-SKU" }]);

    await expect(service.update("tenant-1", "p-1", { sku: "new-sku" } as any)).resolves.toEqual({
      id: "p-1",
      sku: "NEW-SKU",
    });

    const updateChain = mockDb.update.mock.results[0].value;
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ sku: "NEW-SKU" }));
    expect(activityService.log).not.toHaveBeenCalled();
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

    selectQueue.push([{ id: "p-2", stock: 4 }]);
    updateReturningQueue.push([{ id: "p-2", stock: 9 }]);
    await expect(service.adjustStock("tenant-1", "p-2", 5, "IN")).resolves.toEqual({ id: "p-2", stock: 9 });
    const defaultInsertChain = mockDb.insert.mock.results[1].value;
    expect(defaultInsertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: null,
        notes: null,
        createdBy: null,
      }),
    );
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

  it("imports CSV rows as creates, updates, skipped rows, and per-row errors", async () => {
    const { service } = createService();
    jest.spyOn(service, "findBySku")
      .mockResolvedValueOnce({ id: "existing-product" } as any)
      .mockRejectedValueOnce(new NotFoundException("Product not found"))
      .mockRejectedValueOnce(new NotFoundException("Product not found"));
    jest.spyOn(service, "update").mockResolvedValueOnce({ id: "existing-product" } as any);
    jest.spyOn(service, "create")
      .mockResolvedValueOnce({ id: "new-product" } as any)
      .mockRejectedValueOnce(new Error("bad row"));

    const csv = [
      "sku,name,price,description,category,unit,cost,stock,minstock,isactive",
      "EXIST,Existing,100,Old,Cat,pcs,40,5,1,true",
      "NEW,New item,200,New,Cat,pcs,,0,,false",
      ",Missing sku,300,No sku,Cat,pcs,10,1,0,true",
      "BAD,Bad row,400,Bad,Cat,pcs,10,1,0,true",
    ].join("\n");

    await expect(service.importFromCsv("tenant-1", Buffer.from(csv))).resolves.toEqual({
      created: 1,
      errors: ["Line 4: missing sku", "Line 5: bad row"],
      updated: 1,
    });

    expect(service.update).toHaveBeenCalledWith(
      "tenant-1",
      "existing-product",
      expect.objectContaining({ cost: 40, isActive: true, minStock: 1, stock: 5 }),
    );
    expect(service.create).toHaveBeenNthCalledWith(
      1,
      "tenant-1",
      expect.objectContaining({ cost: undefined, isActive: false, minStock: 0, stock: 0 }),
    );
  });

  it("imports rows with empty stock as zero", async () => {
    const { service } = createService();
    jest.spyOn(service, "findBySku").mockRejectedValueOnce(new NotFoundException("Product not found"));
    jest.spyOn(service, "create").mockResolvedValueOnce({ id: "empty-stock" } as any);

    const csv = [
      "sku,name,price,stock",
      "EMPTY,Empty stock,100,",
    ].join("\n");

    await expect(service.importFromCsv("tenant-1", Buffer.from(csv))).resolves.toEqual({
      created: 1,
      errors: [],
      updated: 0,
    });
    expect(service.create).toHaveBeenCalledWith("tenant-1", expect.objectContaining({ stock: 0 }));
  });

  it("finds products by SKU and returns stock transactions", async () => {
    const { service } = createService();
    selectQueue.push([{ id: "p-1", sku: "SKU-1" }], [], { rows: [{ id: "tx-1" }], chainAfterWhere: true });

    await expect(service.findBySku("tenant-1", "SKU-1")).resolves.toEqual({ id: "p-1", sku: "SKU-1" });
    await expect(service.findBySku("tenant-1", "missing")).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getTransactions("tenant-1", "p-1")).resolves.toEqual([{ id: "tx-1" }]);
  });

  it("falls back to ITEM when automatic SKU seed has no alphanumeric characters", async () => {
    const { service } = createService();
    selectQueue.push([]);

    await expect((service as any).resolveSku("tenant-abc-123", undefined, "!!!")).resolves.toMatch(
      /^ITEM-TENANT-\d{6}-0001$/,
    );
  });
});
