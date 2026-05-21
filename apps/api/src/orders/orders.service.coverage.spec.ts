const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

jest.mock("@smart-erp/database", () => ({ db: mockDb }));

jest.mock("@smart-erp/database/schema", () => ({
  orders: {
    id: "orders.id",
    tenantId: "orders.tenantId",
    code: "orders.code",
    status: "orders.status",
    paymentStatus: "orders.paymentStatus",
    channel: "orders.channel",
    createdAt: "orders.createdAt",
  },
  orderItems: {
    orderId: "orderItems.orderId",
  },
  products: {
    id: "products.id",
    tenantId: "products.tenantId",
    name: "products.name",
    sku: "products.sku",
  },
}));

jest.mock("@smart-erp/database/drizzle", () => ({
  eq: jest.fn((field, value) => ({ op: "eq", field, value })),
  and: jest.fn((...conditions) => ({ op: "and", conditions })),
  ilike: jest.fn((field, value) => ({ op: "ilike", field, value })),
  sql: jest.fn((strings, ...values) => ({ op: "sql", strings, values })),
  desc: jest.fn((field) => ({ op: "desc", field })),
  inArray: jest.fn((field, values) => ({ op: "inArray", field, values })),
}));

import { BadRequestException, NotFoundException } from "@nestjs/common";
import { inArray } from "@smart-erp/database/drizzle";
import { products } from "@smart-erp/database/schema";
import { OrdersService } from "./orders.service";

const selectQueue: any[][] = [];
const insertReturningQueue: any[][] = [];
const updateReturningQueue: any[][] = [];

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
  const notifications = { broadcastToTenant: jest.fn() };
  const activityService = { log: jest.fn().mockResolvedValue(undefined) };
  return {
    activityService,
    notifications,
    service: new OrdersService(notifications as any, activityService as any),
  };
};

describe("OrdersService coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectQueue.length = 0;
    insertReturningQueue.length = 0;
    updateReturningQueue.length = 0;

    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain(insertReturningQueue));
    mockDb.update.mockImplementation(() => makeWriteChain(updateReturningQueue));
  });

  it("creates POS orders using an inArray product lookup", async () => {
    const { activityService, notifications, service } = createService();
    selectQueue.push(
      [{ id: "product-1", name: "Cafe sua da", sku: "CAFE-001", unit: "ly" }],
      [{ count: 3 }],
    );
    insertReturningQueue.push([
      {
        id: "order-1",
        code: "DH-000004",
        total: "25000",
        channel: "pos",
        paymentMethod: "cash",
        paymentStatus: "paid",
        createdAt: new Date("2026-05-20T00:00:00.000Z"),
      },
    ]);

    await expect(
      service.create("tenant-1", "user-1", {
        channel: "pos",
        paymentMethod: "cash",
        items: [{ productId: "product-1", quantity: 2, unitPrice: 12500, discountAmount: 0 }],
      } as any),
    ).resolves.toMatchObject({
      id: "order-1",
      code: "DH-000004",
      items: [
        expect.objectContaining({
          productId: "product-1",
          productName: "Cafe sua da",
          productSku: "CAFE-001",
          quantity: 2,
          lineTotal: "25000",
        }),
      ],
    });

    expect(inArray).toHaveBeenCalledWith(products.id, ["product-1"]);
    expect(mockDb.insert).toHaveBeenCalledTimes(2);

    const orderInsertChain = mockDb.insert.mock.results[0].value;
    expect(orderInsertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        code: "DH-000004",
        channel: "pos",
        subtotal: "25000",
        total: "25000",
        paidAmount: "25000",
        debtAmount: "0",
        paymentStatus: "paid",
        paymentMethod: "cash",
      }),
    );

    const itemInsertChain = mockDb.insert.mock.results[1].value;
    expect(itemInsertChain.values).toHaveBeenCalledWith([
      expect.objectContaining({
        orderId: "order-1",
        productId: "product-1",
        productName: "Cafe sua da",
      }),
    ]);

    expect(activityService.log).toHaveBeenCalledWith(
      "tenant-1",
      "user-1",
      "created",
      "order",
      "order-1",
      expect.objectContaining({ code: "DH-000004", paymentStatus: "paid" }),
    );
    expect(notifications.broadcastToTenant).toHaveBeenCalledWith(
      "tenant-1",
      "order.created",
      expect.objectContaining({ id: "order-1", code: "DH-000004" }),
    );
  });

  it("rejects orders whose products are not in the tenant catalog", async () => {
    const { service } = createService();
    await expect(
      service.create("tenant-1", "user-1", { items: [] } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    selectQueue.push([]);

    await expect(
      service.create("tenant-1", "user-1", {
        items: [{ productId: "missing", quantity: 1, unitPrice: 1000 }],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates unpaid credit orders with default line item fields", async () => {
    const { service } = createService();
    selectQueue.push(
      [{ id: "product-2", name: "Tra dao", sku: "TRA-002" }],
      [{ count: 0 }],
    );
    insertReturningQueue.push([
      {
        id: "order-credit",
        code: "DH-000001",
        total: "18000",
        channel: "pos",
        paymentMethod: "credit",
        paymentStatus: "unpaid",
      },
    ]);

    await expect(
      service.create("tenant-1", "user-1", {
        paymentMethod: "credit",
        items: [{ productId: "product-2", quantity: 1, unitPrice: 18000 }],
      } as any),
    ).resolves.toMatchObject({
      items: [
        expect.objectContaining({
          unit: "piece",
          discountAmount: "0",
          discountPercent: "0",
          taxRate: "0",
          notes: null,
          batchNumber: null,
        }),
      ],
    });

    expect(mockDb.insert.mock.results[0].value.values).toHaveBeenCalledWith(
      expect.objectContaining({
        paidAmount: "0",
        debtAmount: "18000",
        paymentStatus: "unpaid",
      }),
    );

    selectQueue.push(
      [{ id: "product-3", name: "Banh mi", sku: "BANH-003" }],
      [{ count: 1 }],
    );
    insertReturningQueue.push([{ id: "order-no-method", code: "DH-000002", paymentStatus: "unpaid" }]);
    await expect(
      service.create("tenant-1", "user-1", {
        items: [{ productId: "product-3", quantity: 1, unitPrice: 15000 }],
      } as any),
    ).resolves.toMatchObject({ id: "order-no-method" });
    expect(mockDb.insert.mock.results[2].value.values).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: null }),
    );
  });

  it("validates required order fields before downstream processing", () => {
    const { service } = createService();

    expect(() => service.validateOrderData({ customerName: "Lan", total: 1, items: [{}] })).toThrow(BadRequestException);
    expect(() => service.validateOrderData({ code: "DH-1", total: 1, items: [{}] })).toThrow(BadRequestException);
    expect(() => service.validateOrderData({ code: "DH-1", customerName: "Lan", total: -1, items: [{}] })).toThrow(BadRequestException);
    expect(() => service.validateOrderData({ code: "DH-1", customerName: "Lan", total: 1, items: [] })).toThrow(BadRequestException);
    expect(() => service.validateOrderData({ code: "DH-1", customerName: "Lan", total: 1, items: [{}] })).not.toThrow();
  });

  it("paginates orders, loads details, and reports missing orders", async () => {
    const { service } = createService();
    selectQueue.push(
      [{ count: 1 }],
      [{ id: "order-1", code: "DH-1" }],
      [],
      [{ id: "order-1", code: "DH-1" }],
      [{ id: "item-1" }],
    );

    await expect(service.findAll("tenant-1", {
      page: 2,
      limit: 10,
      search: "DH",
      status: "confirmed",
      paymentStatus: "paid",
      channel: "pos",
    })).resolves.toEqual({
      items: [{ id: "order-1", code: "DH-1" }],
      total: 1,
      page: 2,
      limit: 10,
      totalPages: 1,
    });

    await expect(service.findOne("tenant-1", "missing")).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne("tenant-1", "order-1")).resolves.toEqual({
      id: "order-1",
      code: "DH-1",
      items: [{ id: "item-1" }],
    });

    selectQueue.push([{ count: 0 }], []);
    await expect(service.findAll("tenant-1", {} as any)).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });

  it("generates escaped Vietnamese e-invoice XML", async () => {
    const { service } = createService();
    jest.useFakeTimers().setSystemTime(new Date("2026-05-21T00:00:00.000Z"));
    jest.spyOn(service, "findOne").mockResolvedValue({
      code: "DH-1",
      customerName: "A&B <Corp>",
      shippingAddress: "HCM",
      total: "1000",
      paymentMethod: "cash",
      items: [
        { productName: "Cafe & \"Milk\"", quantity: 2, unit: "ly", unitPrice: "100", lineTotal: "200" },
      ],
    } as any);

    const xml = await service.generateEInvoiceXml("tenant-1", "order-1");

    expect(xml).toContain("<InvDate>2026-05-21</InvDate>");
    expect(xml).toContain("<ItemName>Cafe &amp; &quot;Milk&quot;</ItemName>");
    expect(xml).toContain("<VATAmount>100</VATAmount>");
    jest.useRealTimers();
  });

  it("uses invoice fallbacks for walk-in buyers, empty addresses, and cash payment", async () => {
    const { service } = createService();
    jest.spyOn(service, "findOne").mockResolvedValue({
      code: "DH-2",
      total: "500",
      items: [{ productName: "Nuoc suoi", quantity: 1, unit: "chai", unitPrice: "500", lineTotal: "500" }],
    } as any);

    const xml = await service.generateEInvoiceXml("tenant-1", "order-2");

    expect(xml).toContain("<BuyerName>Walk-in Customer</BuyerName>");
    expect(xml).toContain("<BuyerAddress></BuyerAddress>");
    expect(xml).toContain("<PaymentMethod>Cash</PaymentMethod>");
  });

  it("updates order statuses through valid transitions and rejects invalid paths", async () => {
    const { activityService, notifications, service } = createService();
    selectQueue.push([], [{ id: "order-1", code: "DH-1", status: "delivered" }], [{ id: "order-1", code: "DH-1", status: "confirmed" }]);

    await expect(service.updateStatus("tenant-1", "user-1", "missing", "confirmed")).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.updateStatus("tenant-1", "user-1", "order-1", "confirmed")).rejects.toBeInstanceOf(BadRequestException);

    updateReturningQueue.push([{ id: "order-1", code: "DH-1", status: "processing" }]);
    await expect(service.updateStatus("tenant-1", "user-1", "order-1", "processing")).resolves.toEqual({
      id: "order-1",
      code: "DH-1",
      status: "processing",
    });

    selectQueue.push([{ id: "order-2", code: "DH-2", status: "processing" }]);
    updateReturningQueue.push([{ id: "order-2", code: "DH-2", status: "shipped" }]);
    await expect(service.updateStatus("tenant-1", "user-1", "order-2", "shipped")).resolves.toMatchObject({ status: "shipped" });

    selectQueue.push([{ id: "order-3", code: "DH-3", status: "shipped" }]);
    updateReturningQueue.push([{ id: "order-3", code: "DH-3", status: "delivered" }]);
    await expect(service.updateStatus("tenant-1", "user-1", "order-3", "delivered")).resolves.toMatchObject({ status: "delivered" });

    selectQueue.push([{ id: "order-4", code: "DH-4", status: "draft" }]);
    updateReturningQueue.push([{ id: "order-4", code: "DH-4", status: "cancelled" }]);
    await expect(service.updateStatus("tenant-1", "user-1", "order-4", "cancelled", "Customer request")).resolves.toMatchObject({ status: "cancelled" });

    selectQueue.push([{ id: "order-5", code: "DH-5", status: "draft" }]);
    updateReturningQueue.push([{ id: "order-5", code: "DH-5", status: "confirmed" }]);
    await expect(service.updateStatus("tenant-1", "user-1", "order-5", "confirmed")).resolves.toMatchObject({ status: "confirmed" });

    selectQueue.push([{ id: "order-6", code: "DH-6", status: "confirmed" }]);
    updateReturningQueue.push([{ id: "order-6", code: "DH-6", status: "cancelled" }]);
    await expect(service.updateStatus("tenant-1", "user-1", "order-6", "cancelled")).resolves.toMatchObject({ status: "cancelled" });

    selectQueue.push([{ id: "order-7", code: "DH-7", status: "archived" }]);
    await expect(service.updateStatus("tenant-1", "user-1", "order-7", "confirmed")).rejects.toBeInstanceOf(BadRequestException);

    expect(activityService.log).toHaveBeenCalledWith("tenant-1", "user-1", "updated", "order", "order-4", expect.objectContaining({
      cancelReason: "Customer request",
    }));
    expect(notifications.broadcastToTenant).toHaveBeenCalledWith("tenant-1", "order.status_changed", expect.objectContaining({ status: "cancelled" }));
  });
});
