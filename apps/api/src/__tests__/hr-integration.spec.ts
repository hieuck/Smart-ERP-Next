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
  db.returning = jest.fn();
  db.then = jest.fn();

  return { db };
});
jest.mock('@smart-erp/database/schema', () => ({ employees: {}, salaryBoards: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  ilike: jest.fn(),
  or: jest.fn(),
  sql: jest.fn(),
}));

import { db } from '@smart-erp/database';
import { HrService } from '../hr/services/hr.service';

describe('HrService (direct instantiation)', () => {
  let service: HrService;
  const TENANT_ID = 'tenant-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (db as any).then.mockImplementation((resolve: any) => resolve([]));
    (db as any).returning.mockReset();
    service = new (HrService as any)();
  });

  describe('createEmployee', () => {
    const baseDto: any = { code: 'EMP-001', name: 'Test Employee', email: 'test@example.com', salary: '10000000' };

    it('creates and returns an employee', async () => {
      const expected: any = {
        id: 'e-1', tenantId: TENANT_ID, code: 'EMP-001', name: 'Test Employee',
        email: 'test@example.com', salary: '10000000', phone: null, position: null,
        isActive: true,
      };
      (db as any).returning.mockResolvedValue([expected]);

      const result = await service.createEmployee(TENANT_ID, baseDto);

      expect(result).toEqual(expected);
      expect(db.insert).toHaveBeenCalled();
    });

    it('throws error when employee code already exists', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([{ id: 'existing' }]));

      await expect(service.createEmployee(TENANT_ID, baseDto))
        .rejects.toThrow('Employee code already exists');
    });
  });

  describe('findAllEmployees', () => {
    const employees = [
      { id: 'e-1', code: 'EMP-001', name: 'Alpha', email: 'alpha@test.com', salary: '10000000', tenantId: TENANT_ID, isActive: true, phone: null, position: null },
      { id: 'e-2', code: 'EMP-002', name: 'Beta', email: 'beta@test.com', salary: '20000000', tenantId: TENANT_ID, isActive: true, phone: null, position: null },
    ];

    it('returns paginated employees list', async () => {
      (db as any).then
        .mockImplementationOnce((resolve: any) => resolve([{ count: 2 }]))
        .mockImplementationOnce((resolve: any) => resolve(employees));

      const result = await service.findAllEmployees(TENANT_ID, {});

      expect(result.items).toEqual(employees);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('applies max limit of 100', async () => {
      (db as any).then
        .mockImplementationOnce((resolve: any) => resolve([{ count: 0 }]))
        .mockImplementationOnce((resolve: any) => resolve([]));

      const result = await service.findAllEmployees(TENANT_ID, { limit: 200 });

      expect(result.limit).toBe(100);
    });

    it('filters by search term', async () => {
      const filtered = [employees[0]];
      (db as any).then
        .mockImplementationOnce((resolve: any) => resolve([{ count: 1 }]))
        .mockImplementationOnce((resolve: any) => resolve(filtered));

      const result = await service.findAllEmployees(TENANT_ID, { search: 'Alp' });

      expect(result.items).toEqual(filtered);
    });

    it('computes totalPages correctly', async () => {
      (db as any).then
        .mockImplementationOnce((resolve: any) => resolve([{ count: 5 }]))
        .mockImplementationOnce((resolve: any) => resolve(employees));

      const result = await service.findAllEmployees(TENANT_ID, { limit: 2 });

      expect(result.totalPages).toBe(3);
    });
  });

  describe('findOneEmployee', () => {
    const employee: any = { id: 'e-1', code: 'EMP-001', name: 'Item', email: 'item@test.com', salary: '10000000', tenantId: TENANT_ID };

    it('returns an employee by id within tenant', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([employee]));

      const result = await service.findOneEmployee(TENANT_ID, 'e-1');

      expect(result).toEqual(employee);
    });

    it('throws NotFoundException when not found', async () => {
      await expect(service.findOneEmployee(TENANT_ID, 'missing'))
        .rejects.toThrow('Employee not found');
    });
  });

  describe('updateEmployee', () => {
    const employee: any = { id: 'e-1', code: 'EMP-001', name: 'Original', email: 'orig@test.com', salary: '10000000', tenantId: TENANT_ID };

    it('updates and returns the employee', async () => {
      const updated: any = { ...employee, name: 'Updated' };
      (db as any).returning.mockResolvedValue([updated]);

      const result = await service.updateEmployee(TENANT_ID, 'e-1', { name: 'Updated' } as any);

      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when employee not found', async () => {
      (db as any).returning.mockResolvedValue([]);

      await expect(service.updateEmployee(TENANT_ID, 'missing', { name: 'Nope' } as any))
        .rejects.toThrow('Employee not found');
    });
  });

  describe('removeEmployee', () => {
    const employee: any = { id: 'e-1', code: 'EMP-001', name: 'Deleted', email: 'del@test.com', salary: '10000000', tenantId: TENANT_ID };

    it('deletes and returns the employee', async () => {
      (db as any).returning.mockResolvedValue([employee]);

      const result = await service.removeEmployee(TENANT_ID, 'e-1');

      expect(result).toEqual(employee);
    });

    it('throws NotFoundException when employee not found', async () => {
      (db as any).returning.mockResolvedValue([]);

      await expect(service.removeEmployee(TENANT_ID, 'missing'))
        .rejects.toThrow('Employee not found');
    });
  });

  describe('processPayroll', () => {
    const employees = [
      { id: 'e-1', code: 'EMP-001', name: 'Alpha', email: 'a@test.com', salary: '10000000', tenantId: TENANT_ID, isActive: true },
      { id: 'e-2', code: 'EMP-002', name: 'Beta', email: 'b@test.com', salary: '20000000', tenantId: TENANT_ID, isActive: true },
    ];

    it('creates salary board when none exists for current month', async () => {
      (db as any).then
        .mockImplementationOnce((resolve: any) => resolve(employees))
        .mockImplementationOnce((resolve: any) => resolve([]));

      await service.processPayroll(TENANT_ID);

      expect(db.insert).toHaveBeenCalled();
    });

    it('skips creation when salary board already exists', async () => {
      (db as any).then
        .mockImplementationOnce((resolve: any) => resolve(employees))
        .mockImplementationOnce((resolve: any) => resolve([{ id: 'sb-1' }]));

      await expect(service.processPayroll(TENANT_ID)).resolves.toBeUndefined();
    });
  });

  describe('getPayrolls', () => {
    const payrolls = [
      { id: 'sb-1', name: 'Bang luong thang 06/2026', month: '6', year: '2026', status: 'draft', totalEmployees: '10', totalNetSalary: '100000000' },
      { id: 'sb-2', name: 'Bang luong thang 07/2026', month: '7', year: '2026', status: 'draft', totalEmployees: '10', totalNetSalary: '110000000' },
    ];

    it('returns paginated payrolls list', async () => {
      (db as any).then
        .mockImplementationOnce((resolve: any) => resolve([{ count: 2 }]))
        .mockImplementationOnce((resolve: any) => resolve(payrolls));

      const result = await service.getPayrolls(TENANT_ID, {});

      expect(result.items).toEqual(payrolls);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('applies max limit of 100', async () => {
      (db as any).then
        .mockImplementationOnce((resolve: any) => resolve([{ count: 0 }]))
        .mockImplementationOnce((resolve: any) => resolve([]));

      const result = await service.getPayrolls(TENANT_ID, { limit: 200 });

      expect(result.limit).toBe(100);
    });
  });
});
