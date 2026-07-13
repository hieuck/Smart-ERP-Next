const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
};

jest.mock("@smart-erp/database", () => ({ db: mockDb }));

jest.mock("@smart-erp/database/schema", () => ({
  orders: {
    id: "orders.id",
    tenantId: "orders.tenantId",
    customerId: "orders.customerId",
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
  customers: {
    id: "customers.id",
    tenantId: "customers.tenantId",
    name: "customers.name",
  },
  warehouses: {
    id: "warehouses.id",
    tenantId: "warehouses.tenantId",
  },
}));

jest.mock("@smart-erp/database/drizzle", () => ({
  eq: jest.fn((field, value) => ({ op: "eq", field, value })),
  and: jest.fn((...conditions) => ({ op: "and", conditions })),
  inArray: jest.fn((field, values) => ({ op: "inArray", field, values })),
  sql: jest.fn((strings, ...values) => ({ op: "sql", strings, values })),
}));

import { BadRequestException } from "@nestjs/common";
import { OrdersService } from "./orders.service";

const selectQueue: any[][] = [];
const insertReturningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    leftJoin: jest.fn(() => chain),
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

const makeCreateDto = (overrides: Record<string, any> = {}) => ({
  channel: "pos",
  paymentMethod: "cash",
  customerId: "customer-1",
  warehouseId: "warehouse-1",
  items: [{ productId: "product-1", quantity: 1, unitPrice: 10000 }],
  ...overrides,
});

describe("OrdersService issue #551 — tenant-scoped customerId and warehouseId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectQueue.length = 0;
    insertReturningQueue.length = 0;

    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain(insertReturningQueue));
  });

  it("rejects order creation when customerId belongs to another tenant", async () => {
    const { service } = createService();

    selectQueue.push(
      [{ id: "product-1", name: "Product A", sku: "SKU-1" }],
      [{ count: 0 }],
      [], // customer lookup returns nothing for this tenant
    );

    await expect(
      service.create("tenant-1", "user-1", makeCreateDto({ customerId: "foreign-customer" })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects order creation when warehouseId belongs to another tenant", async () => {
    const { service } = createService();

    selectQueue.push(
      [{ id: "product-1", name: "Product A", sku: "SKU-1" }],
      [{ id: "customer-1" }], // customer belongs to tenant
      [], // warehouse lookup returns nothing for this tenant
    );

    await expect(
      service.create("tenant-1", "user-1", makeCreateDto({ warehouseId: "foreign-warehouse" })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates order when customerId and warehouseId both belong to the tenant", async () => {
    const { service, notifications, activityService } = createService();

    selectQueue.push(
      [{ id: "product-1", name: "Product A", sku: "SKU-1" }],
      [{ id: "customer-1" }],
      [{ id: "warehouse-1" }],
      [{ count: 0 }],
    );
    insertReturningQueue.push([
      {
        id: "order-1",
        code: "DH-000001",
        total: "10000",
        channel: "pos",
        paymentMethod: "cash",
        paymentStatus: "paid",
        createdAt: new Date(),
      },
    ]);

    await expect(
      service.create("tenant-1", "user-1", makeCreateDto()),
    ).resolves.toMatchObject({
      id: "order-1",
      code: "DH-000001",
      total: "10000",
    });

    expect(notifications.broadcastToTenant).toHaveBeenCalledWith(
      "tenant-1",
      "order.created",
      expect.objectContaining({ id: "order-1", code: "DH-000001" }),
    );
    expect(activityService.log).toHaveBeenCalledWith(
      "tenant-1",
      "user-1",
      "created",
      "order",
      "order-1",
      expect.objectContaining({ code: "DH-000001" }),
    );
  });

  it("findOne does not leak customer name from another tenant", async () => {
    const { service } = createService();

    selectQueue.push([
      {
        order: {
          id: "order-1",
          code: "DH-000001",
          customerId: "customer-1",
          tenantId: "tenant-1",
        },
        customerName: null,
      },
    ]);
    selectQueue.push([{ id: "item-1" }]);

    const result = await service.findOne("tenant-1", "order-1");
    expect(result.customerName).toBeNull();

    const selectChain = mockDb.select.mock.results[0].value;
    expect(selectChain.leftJoin).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ op: "and" }),
    );
  });
});
