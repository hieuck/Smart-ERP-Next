import { createMockDb, createMockDrizzleService } from './db.mock';

const mockDb = createMockDb();
const mockDrizzleService = createMockDrizzleService(mockDb);

jest.mock('@smart-erp/database', () => ({ db: mockDb }));
jest.mock('@smart-erp/database/schema', () => ({ products: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn(),
  and: jest.fn(),
}));

import { BadRequestException } from '@nestjs/common';
import { ImportService } from '../import/import.service';
import * as XLSX from '@stackline/xlsx';

function createTestXlsx(rows: Record<string, any>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

describe('ImportService', () => {
  let service: ImportService;
  const TENANT_ID = 'tenant-1';

  beforeEach(() => {
    mockDb._reset();
    service = new ImportService(mockDrizzleService as any);
  });

  describe('previewProducts', () => {
    it('returns preview with correct row count for valid xlsx', async () => {
      const buffer = createTestXlsx([
        { name: 'Product A', sku: 'SKU-A', price: 100 },
        { name: 'Product B', sku: 'SKU-B', price: 200 },
      ]);

      const result = await service.previewProducts(TENANT_ID, buffer, 'test.xlsx');

      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(2);
      expect(result.errorRows).toBe(0);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].errors).toEqual([]);
      expect(result.rows[0].data.name).toBe('Product A');
      expect(result.rows[0].data.sku).toBe('SKU-A');
      expect(result.rows[0].data.price).toBe(100);
    });

    it('returns errors for rows missing name or sku or price <= 0', async () => {
      const buffer = createTestXlsx([
        { name: '', sku: 'SKU-1', price: 100 },
        { name: 'Product', sku: '', price: 100 },
        { name: 'Product', sku: 'SKU-2', price: 0 },
      ]);

      const result = await service.previewProducts(TENANT_ID, buffer, 'test.xlsx');

      expect(result.totalRows).toBe(3);
      expect(result.validRows).toBe(0);
      expect(result.errorRows).toBe(3);
      expect(result.rows[0].errors).toContain('Missing product name');
      expect(result.rows[1].errors).toContain('Missing SKU');
      expect(result.rows[2].errors).toContain('Price must be > 0');
    });

    it('throws BadRequestException for empty file', async () => {
      const buffer = createTestXlsx([]);

      await expect(service.previewProducts(TENANT_ID, buffer, 'empty.xlsx'))
        .rejects.toThrow(BadRequestException);
    });

    it('maps Vietnamese column names correctly', async () => {
      const buffer = createTestXlsx([
        { 'Tên sản phẩm': 'Sản phẩm 1', 'Mã': 'SP-001', 'Giá': 150000 },
      ]);

      const result = await service.previewProducts(TENANT_ID, buffer, 'test.xlsx');

      expect(result.rows[0].data.name).toBe('Sản phẩm 1');
      expect(result.rows[0].data.sku).toBe('SP-001');
      expect(result.rows[0].data.price).toBe(150000);
    });
  });

  describe('confirmImport', () => {
    it('inserts valid rows and skips error rows', async () => {
      const buffer = createTestXlsx([
        { name: 'Good A', sku: 'SKU-G1', price: 100 },
        { name: '', sku: 'SKU-B', price: 50 },
        { name: 'Good B', sku: 'SKU-G2', price: 200 },
      ]);
      mockDb._resolveWith([]);

      const preview = await service.previewProducts(TENANT_ID, buffer, 'test.xlsx');
      expect(preview.validRows).toBe(2);
      expect(preview.errorRows).toBe(1);

      mockDb._queueSequence([{ id: 'p1', name: 'Good A' }, { id: 'p2', name: 'Good B' }]);

      const result = await service.confirmImport(TENANT_ID, preview.batchId);

      expect(result.imported).toBe(2);
      expect(result.errors).toBe(1);
    });

    it('throws BadRequestException for invalid batchId', async () => {
      await expect(service.confirmImport(TENANT_ID, 'non-existent-batch'))
        .rejects.toThrow(BadRequestException);
    });

    it('calls db.insert for each valid row', async () => {
      const buffer = createTestXlsx([
        { name: 'Product', sku: 'SKU-X', price: 99 },
      ]);
      mockDb._resolveWith([]);

      const preview = await service.previewProducts(TENANT_ID, buffer, 'test.xlsx');

      mockDb._queueSequence([{ id: 'p-x' }]);
      await service.confirmImport(TENANT_ID, preview.batchId);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Product', sku: 'SKU-X', price: '99' }),
      );
    });
  });

  describe('getPreview', () => {
    it('returns undefined for non-existent batch', () => {
      expect(service.getPreview('missing')).toBeUndefined();
    });

    it('returns preview data for existing batch', async () => {
      const buffer = createTestXlsx([{ name: 'Test', sku: 'T-1', price: 10 }]);
      mockDb._resolveWith([]);

      const preview = await service.previewProducts(TENANT_ID, buffer, 'test.xlsx');
      const result = service.getPreview(preview.batchId);

      expect(result).toBeDefined();
      expect(result!.totalRows).toBe(1);
    });
  });
});
