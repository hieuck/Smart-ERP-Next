const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  employees: {
    tenantId: 'employees.tenantId',
    code: 'employees.code',
    id: 'employees.id',
    name: 'employees.name',
    email: 'employees.email',
  },
  payrolls: {
    tenantId: 'payrolls.tenantId',
    employeeId: 'payrolls.employeeId',
    month: 'payrolls.month',
    year: 'payrolls.year',
    id: 'payrolls.id',
    baseSalary: 'payrolls.baseSalary',
    allowances: 'payrolls.allowances',
    deductions: 'payrolls.deductions',
    netSalary: 'payrolls.netSalary',
  },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  ilike: jest.fn((field, value) => ({ op: 'ilike', field, value })),
  or: jest.fn((...conditions) => ({ op: 'or', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { NotFoundException } from '@nestjs/common';
import { HrService } from './hr.service';

const selectQueue: any[][] = [];
const returningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    innerJoin: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    offset: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeWriteChain = () => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('HrService coverage', () => {
  let service: HrService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    mockDb.delete.mockImplementation(() => makeWriteChain());
    service = new HrService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates employees only when employee code is unique', async () => {
    selectQueue.push([{ id: 'existing' }]);
    await expect(service.createEmployee('tenant-1', { code: 'E001', name: 'Lan' } as any)).rejects.toThrow('Employee code already exists');

    selectQueue.push([]);
    returningQueue.push([{ id: 'employee-1', code: 'E001', tenantId: 'tenant-1' }]);
    await expect(service.createEmployee('tenant-1', { code: 'E001', name: 'Lan' } as any)).resolves.toEqual({
      id: 'employee-1',
      code: 'E001',
      tenantId: 'tenant-1',
    });
  });

  it('lists, finds, updates, and removes employees with not-found branches', async () => {
    selectQueue.push([{ count: 2 }], [{ id: 'employee-1' }, { id: 'employee-2' }]);
    await expect(service.findAllEmployees('tenant-1', { page: 2, limit: 10, search: 'lan' })).resolves.toEqual({
      items: [{ id: 'employee-1' }, { id: 'employee-2' }],
      total: 2,
      page: 2,
      limit: 10,
      totalPages: 1,
    });

    selectQueue.push([{ count: 0 }], []);
    await expect(service.findAllEmployees('tenant-1', {} as any)).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });

    selectQueue.push([], [{ id: 'employee-1' }]);
    await expect(service.findOneEmployee('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOneEmployee('tenant-1', 'employee-1')).resolves.toEqual({ id: 'employee-1' });

    returningQueue.push([], [{ id: 'employee-1', name: 'Lan 2' }], [], [{ id: 'employee-1' }]);
    await expect(service.updateEmployee('tenant-1', 'missing', { name: 'X' } as any)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.updateEmployee('tenant-1', 'employee-1', { name: 'Lan 2' } as any)).resolves.toEqual({ id: 'employee-1', name: 'Lan 2' });
    await expect(service.removeEmployee('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.removeEmployee('tenant-1', 'employee-1')).resolves.toEqual({ id: 'employee-1' });
  });

  it('processes missing payrolls and paginates payroll reports', async () => {
    selectQueue.push(
      [{ id: 'employee-1', salary: '1000' }, { id: 'employee-2', salary: '2000' }],
      [],
      [{ id: 'existing-payroll' }],
    );

    await service.processPayroll('tenant-1');

    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(mockDb.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      employeeId: 'employee-1',
      month: '5',
      year: 2026,
      netSalary: '1000',
    }));

    selectQueue.push([{ count: 1 }], [{ id: 'payroll-1', employeeName: 'Lan' }]);
    await expect(service.getPayrolls('tenant-1', { page: 1, limit: 5 })).resolves.toEqual({
      items: [{ id: 'payroll-1', employeeName: 'Lan' }],
      total: 1,
      page: 1,
      limit: 5,
      totalPages: 1,
    });

    selectQueue.push([{ count: 0 }], []);
    await expect(service.getPayrolls('tenant-1', {} as any)).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });
});
