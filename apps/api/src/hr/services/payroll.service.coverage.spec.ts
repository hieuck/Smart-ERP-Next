jest.mock('@smart-erp/database', () => ({
  salaryBoards: { tenantId: 'salaryBoards.tenantId', year: 'salaryBoards.year', month: 'salaryBoards.month', id: 'salaryBoards.id' },
  payslips: {},
  attendanceRecords: {},
  users: {},
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { NotFoundException } from '@nestjs/common';
import { PayrollService } from './payroll.service';

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => Promise.resolve(rows)),
  };
  return chain;
};

const makeWriteChain = (returningQueue: any[][]) => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('PayrollService coverage', () => {
  const selectQueue: any[][] = [];
  const returningQueue: any[][] = [];
  const drizzle = {
    db: {
      select: jest.fn(() => makeSelectChain(selectQueue.shift() ?? [])),
      insert: jest.fn(() => makeWriteChain(returningQueue)),
      update: jest.fn(() => makeWriteChain(returningQueue)),
      execute: jest.fn(),
    },
  };
  let service: PayrollService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    service = new PayrollService(drizzle as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists salary boards newest period first', async () => {
    selectQueue.push([{ id: 'board-1' }]);

    await expect(service.listBoards('tenant-1')).resolves.toEqual([{ id: 'board-1' }]);
  });

  it('generates salary boards from attendance aggregates', async () => {
    returningQueue.push([{ id: 'board-1', name: 'Bảng lương tháng 05/2026' }]);
    drizzle.db.execute.mockResolvedValueOnce([
      { employee_id: 'employee-1', present_days: '22', total_ot: '8', total_late: '5' },
      { employee_id: 'employee-2', present_days: '0', total_ot: null, total_late: null },
    ]);

    await expect(service.generateSalaryBoard('tenant-1', 'user-1', 5, 2026)).resolves.toEqual({
      id: 'board-1',
      name: 'Bảng lương tháng 05/2026',
    });

    expect(drizzle.db.insert).toHaveBeenCalledTimes(3);
    expect(drizzle.db.update).toHaveBeenCalledTimes(1);
    expect(drizzle.db.update.mock.results[0].value.set).toHaveBeenCalledWith(expect.objectContaining({
      totalEmployees: '2',
    }));
  });

  it('loads payslips and approves existing boards only', async () => {
    const payslips = [{ id: 'payslip-1', employee_name: 'Lan' }];
    drizzle.db.execute.mockResolvedValueOnce(payslips);
    await expect(service.getPayslips('tenant-1', 'board-1')).resolves.toBe(payslips);

    returningQueue.push([], [{ id: 'board-1', status: 'approved' }]);
    await expect(service.approveBoard('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.approveBoard('tenant-1', 'board-1')).resolves.toEqual({ id: 'board-1', status: 'approved' });
  });
});
