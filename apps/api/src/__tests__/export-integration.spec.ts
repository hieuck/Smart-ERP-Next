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
jest.mock('@smart-erp/database/schema', () => ({ products: {}, customers: {}, orders: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  gte: jest.fn(),
  lte: jest.fn(),
  sql: jest.fn(),
}));

import { NotFoundException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { DataExportService } from '../exports/data-export.service';
import { ExportFormat } from '../exports/export.enums';

describe('DataExportService (direct instantiation)', () => {
  let service: DataExportService;
  const TENANT_ID = 'tenant-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (db as any).then.mockImplementation((resolve: any) => resolve([]));
    (db as any).returning.mockReset();
    (db as any).returning.mockResolvedValue([]);
    (db as any).execute.mockReset();
    (db as any).execute.mockResolvedValue({ rows: [] });
    service = new DataExportService({ db } as any);
  });

  describe('exportData', () => {
    it('returns CSV formatted data for products entity', async () => {
      const rows = [
        { id: 'p-1', name: 'Product A', sku: 'SKU-001', price: '100', stock: 10, isActive: true },
        { id: 'p-2', name: 'Product B', sku: 'SKU-002', price: '200', stock: 5, isActive: false },
      ];
      (db as any).then.mockImplementation((resolve: any) => resolve(rows));

      const result = await service.exportData(TENANT_ID, ExportFormat.CSV, ['products']);

      expect(result.format).toBe('csv');
      expect(result.mimeType).toBe('text/csv');
      expect(result.filename).toMatch(/\.csv$/);
      expect(result.data).toContain('id,name,sku,price,stock,isActive');
      expect(result.data).toContain('p-1,Product A,SKU-001,100,10,true');
      expect(result.data).toContain('p-2,Product B,SKU-002,200,5,false');
      expect(result.entityCount).toBe(2);
    });

    it('escapes commas and quotes in CSV fields', async () => {
      const rows = [
        { id: 'p-1', name: 'Product, "Premium"', sku: 'SKU-001', price: '100', stock: 10 },
      ];
      (db as any).then.mockImplementation((resolve: any) => resolve(rows));

      const result = await service.exportData(TENANT_ID, ExportFormat.CSV, ['products']);

      expect(result.data).toContain('"Product, ""Premium"""');
    });

    it('handles newlines in CSV fields', async () => {
      const rows = [
        { id: 'p-1', name: 'Multi\nline', sku: 'SKU-001', price: '100', stock: 10 },
      ];
      (db as any).then.mockImplementation((resolve: any) => resolve(rows));

      const result = await service.exportData(TENANT_ID, ExportFormat.CSV, ['products']);

      expect(result.data).toContain('"Multi\nline"');
    });

    it('returns JSON formatted data for products entity', async () => {
      const rows = [
        { id: 'p-1', name: 'Item', sku: 'SKU-001', price: '100' },
        { id: 'p-2', name: 'Item 2', sku: 'SKU-002', price: '200' },
      ];
      (db as any).then.mockImplementation((resolve: any) => resolve(rows));

      const result = await service.exportData(TENANT_ID, ExportFormat.JSON, ['products']);

      expect(result.format).toBe('json');
      expect(result.mimeType).toBe('application/json');
      expect(result.filename).toMatch(/\.json$/);
      const parsed = JSON.parse(result.data);
      expect(parsed).toHaveProperty('products');
      expect(parsed.products).toHaveLength(2);
      expect(parsed.products[0]).toHaveProperty('name', 'Item');
      expect(result.entityCount).toBe(2);
    });

    it('throws error for invalid entity', async () => {
      await expect(
        service.exportData(TENANT_ID, ExportFormat.CSV, ['nonexistent']),
      ).rejects.toThrow('Unknown entity: nonexistent');
    });

    it('returns empty CSV when no data matches', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([]));

      const result = await service.exportData(TENANT_ID, ExportFormat.CSV, ['products']);

      expect(result.data).toBe('');
      expect(result.entityCount).toBe(0);
    });

    it('exports multiple entities in a single call', async () => {
      const productRows = [{ id: 'p-1', name: 'Widget', sku: 'W-001', price: '50', stock: 10 }];
      const customerRows = [{ id: 'c-1', code: 'CUS-001', name: 'Acme Corp', phone: '0900000000' }];

      (db as any).then
        .mockImplementationOnce((resolve: any) => resolve(productRows))
        .mockImplementationOnce((resolve: any) => resolve(customerRows));

      const result = await service.exportData(TENANT_ID, ExportFormat.JSON, ['products', 'customers']);

      const parsed = JSON.parse(result.data);
      expect(parsed).toHaveProperty('products');
      expect(parsed).toHaveProperty('customers');
      expect(parsed.products).toHaveLength(1);
      expect(parsed.customers).toHaveLength(1);
      expect(result.entityCount).toBe(2);
    });
  });

  describe('getExportableEntities', () => {
    it('returns available entity types with key and label', () => {
      const entities = service.getExportableEntities();

      expect(entities).toBeInstanceOf(Array);
      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0]).toHaveProperty('key');
      expect(entities[0]).toHaveProperty('label');
    });
  });

  describe('createExportJob', () => {
    it('returns a persisted job with pending status', async () => {
      const result = await service.createExportJob(TENANT_ID, ExportFormat.CSV, ['products']);

      expect(result).toHaveProperty('status', 'pending');
      expect(result).toHaveProperty('tenantId', TENANT_ID);
      expect(result).toHaveProperty('entities', ['products']);
      expect(result).toHaveProperty('format', ExportFormat.CSV);
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('id');
    });
  });

  describe('getExportStatus', () => {
    it('returns status for a persisted job', async () => {
      const job = await service.createExportJob(TENANT_ID, ExportFormat.JSON, ['orders']);
      const result = await service.getExportStatus(TENANT_ID, job.id);

      expect(result.id).toBe(job.id);
      expect(result.tenantId).toBe(TENANT_ID);
      expect(result.status).toBe('pending');
    });

    it('throws NotFoundException for an unknown job', async () => {
      await expect(service.getExportStatus(TENANT_ID, 'unknown-job')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getExportFile', () => {
    it('returns a Buffer for a persisted job', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([{ id: 'p-1', name: 'Product A' }]));
      const job = await service.createExportJob(TENANT_ID, ExportFormat.JSON, ['products']);

      const result = await service.getExportFile(TENANT_ID, job.id);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('throws NotFoundException for an unknown job', async () => {
      await expect(service.getExportFile(TENANT_ID, 'unknown-job')).rejects.toThrow(NotFoundException);
    });
  });
});
