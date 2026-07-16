const mockDb = {
  select: jest.fn(),
};

jest.mock("@smart-erp/database", () => ({ db: mockDb }));

jest.mock("@smart-erp/database/schema", () => ({
  products: {
    id: "products.id",
    tenantId: "products.tenantId",
    sku: "products.sku",
    name: "products.name",
    barcode: "products.barcode",
  },
}));

jest.mock("@smart-erp/database/drizzle", () => ({
  eq: jest.fn((field, value) => ({ op: "eq", field, value })),
  and: jest.fn((...conditions) => ({ op: "and", conditions })),
}));

import { NotFoundException } from "@nestjs/common";
import { ProductsService } from "../products/products.service";
import { ProductsController } from "../products/products.controller";

describe("Barcode integration", () => {
  describe("ProductsService.findByBarcode", () => {
    let service: ProductsService;
    let activityService: any;

    const makeSelectChain = (rows: any[]) => {
      const chain: any = {
        from: jest.fn(() => chain),
        where: jest.fn(() => chain),
        limit: jest.fn(() => chain),
        then: jest.fn((onFulfilled: any) => onFulfilled(rows)),
      };
      return chain;
    };

    beforeEach(() => {
      jest.clearAllMocks();
      activityService = { log: jest.fn().mockResolvedValue(undefined) };
      service = new ProductsService(activityService as any);
    });

    it("returns a product when barcode matches an existing SKU", async () => {
      const product = { id: "p-1", sku: "BARCODE-001", name: "Test" };
      mockDb.select.mockReturnValueOnce(makeSelectChain([product]));

      const result = await (service as any).findByBarcode("tenant-1", "BARCODE-001");

      expect(result).toEqual(product);
    });

    it("throws NotFoundException when barcode does not match any SKU", async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChain([]));

      await expect(
        (service as any).findByBarcode("tenant-1", "NONEXISTENT"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("ProductsController.findByBarcode", () => {
    it("delegates to service.findByBarcode with tenantId and code", async () => {
      const mockService = { findByBarcode: jest.fn().mockResolvedValue({ id: "p-1" }) };
      const controller = new (ProductsController as any)(mockService);
      const req = { user: { tenantId: "t1" } };

      const result = await controller.findByBarcode(req, "CODE-123");

      expect(mockService.findByBarcode).toHaveBeenCalledWith("t1", "CODE-123");
      expect(result).toEqual({ id: "p-1" });
    });
  });
});
