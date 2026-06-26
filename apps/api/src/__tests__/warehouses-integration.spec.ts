jest.mock('@smart-erp/database', () => {
  const db: any = () => db;
  const chainFn = jest.fn(() => db);
  const setSpy = jest.fn(() => db);

  db.select = chainFn;
  db.from = chainFn;
  db.where = chainFn;
  db.orderBy = chainFn;
  db.limit = chainFn;
  db.offset = chainFn;
  db.insert = chainFn;
  db.values = chainFn;
  db.update = chainFn;
  db.set = setSpy;
  db.delete = chainFn;
  db.execute = jest.fn();
  db.returning = jest.fn();
  db.then = jest.fn();

  return { db };
});
jest.mock('@smart-erp/database/schema', () => ({
  warehouses: {
    id: 'warehouses.id',
    tenantId: 'warehouses.tenantId',
    code: 'warehouses.code',
    name: 'warehouses.name',
    isDefault: 'warehouses.isDefault',
    isActive: 'warehouses.isActive',
    updatedAt: 'warehouses.updatedAt',
    createdAt: 'warehouses.createdAt',
  },
}));
jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  sql: jest.fn(),
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { WarehousesService } from '../warehouses/warehouses.service';

describe('WarehousesService (integration)', () => {
  let service: WarehousesService;
  const TENANT_ID = 'tenant-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (db as any).then.mockImplementation((resolve: any) => resolve([]));
    (db as any).returning.mockReset();
    (db as any).returning.mockResolvedValue([]);
    service = new (WarehousesService as any)();
  });

  describe('create', () => {
    const baseDto: any = { code: 'WH-001', name: 'Kho Chinh', address: 'Ha Noi' };

    it('creates and returns a warehouse', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([]));

      const expected: any = {
        id: 'wh-1', tenantId: TENANT_ID, code: 'WH-001', name: 'Kho Chinh',
        address: 'Ha Noi', isDefault: false, isActive: true,
      };
      (db as any).returning.mockResolvedValue([expected]);

      const result = await service.create(TENANT_ID, baseDto);

      expect(result).toEqual(expected);
      expect((db as any).insert).toHaveBeenCalled();
    });

    it('throws ConflictException when warehouse code already exists', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([{ id: 'existing' }]));

      await expect(service.create(TENANT_ID, baseDto))
        .rejects.toThrow(ConflictException);
    });

    it('un-sets default on other warehouses when isDefault is true', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([]));
      const expected: any = {
        id: 'wh-2', tenantId: TENANT_ID, code: 'WH-002', name: 'Default WH', isDefault: true,
      };
      (db as any).returning.mockResolvedValue([expected]);

      const result = await service.create(TENANT_ID, { ...baseDto, code: 'WH-002', isDefault: true });

      expect(result.isDefault).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it('does not un-set defaults when isDefault is not set', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([]));
      (db as any).returning.mockResolvedValue([{ id: 'wh-3', isDefault: false }]);

      await service.create(TENANT_ID, baseDto);

      expect((db as any).set).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns active warehouses ordered by name', async () => {
      const warehouses = [
        { id: 'wh-1', name: 'Alpha', code: 'A', tenantId: TENANT_ID, isActive: true },
        { id: 'wh-2', name: 'Beta', code: 'B', tenantId: TENANT_ID, isActive: true },
      ];
      (db as any).then.mockImplementation((resolve: any) => resolve(warehouses));

      const result = await service.findAll(TENANT_ID);

      expect(result).toEqual(warehouses);
    });

    it('returns empty array when no warehouses', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([]));

      const result = await service.findAll(TENANT_ID);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    const warehouse: any = {
      id: 'wh-1', name: 'Kho Chinh', code: 'WH-001', tenantId: TENANT_ID, isActive: true,
    };

    it('returns a warehouse by id within tenant', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([warehouse]));

      const result = await service.findOne(TENANT_ID, 'wh-1');

      expect(result).toEqual(warehouse);
    });

    it('throws NotFoundException when not found', async () => {
      await expect(service.findOne(TENANT_ID, 'missing'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('findDefault', () => {
    it('returns default warehouse when exists', async () => {
      const warehouse: any = {
        id: 'wh-1', name: 'Default', code: 'DEFAULT', tenantId: TENANT_ID, isDefault: true,
      };
      (db as any).then.mockImplementation((resolve: any) => resolve([warehouse]));

      const result = await service.findDefault(TENANT_ID);

      expect(result).toEqual(warehouse);
    });

    it('returns null when no default warehouse exists', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([]));

      const result = await service.findDefault(TENANT_ID);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const warehouse: any = {
      id: 'wh-1', name: 'Original', code: 'WH-001', tenantId: TENANT_ID,
      isDefault: false, isActive: true,
    };

    it('updates and returns the warehouse', async () => {
      const updated: any = { ...warehouse, name: 'Updated' };
      (db as any).returning.mockResolvedValue([updated]);

      const result = await service.update(TENANT_ID, 'wh-1', { name: 'Updated' } as any);

      expect(result).toEqual(updated);
    });

    it('un-sets default on others when isDefault is true', async () => {
      const updated: any = { ...warehouse, isDefault: true };
      (db as any).returning.mockResolvedValue([updated]);

      const result = await service.update(TENANT_ID, 'wh-1', { isDefault: true } as any);

      expect(result.isDefault).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it('throws NotFoundException when warehouse not found', async () => {
      (db as any).returning.mockResolvedValue([]);

      await expect(service.update(TENANT_ID, 'missing', { name: 'Nope' } as any))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const warehouse: any = {
      id: 'wh-1', name: 'To Delete', code: 'DEL', tenantId: TENANT_ID,
    };

    it('deletes and returns the warehouse', async () => {
      (db as any).returning.mockResolvedValue([warehouse]);

      const result = await service.remove(TENANT_ID, 'wh-1');

      expect(result).toEqual(warehouse);
      expect(db.delete).toHaveBeenCalled();
    });

    it('throws NotFoundException when warehouse not found', async () => {
      (db as any).returning.mockResolvedValue([]);

      await expect(service.remove(TENANT_ID, 'missing'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
