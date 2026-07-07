jest.mock('../../drizzle/drizzle.service', () => ({
  DrizzleService: jest.fn().mockImplementation(function (this: any, db: any) {
    this.db = db;
  }),
}));

jest.mock('@smart-erp/database', () => ({
  salaryBoards: {},
  payslips: {},
  attendanceRecords: {},
  users: {},
}));

jest.mock('drizzle-orm', () => ({
  sql: jest.fn((strings: TemplateStringsArray, ...values: any[]) => {
    let query = strings[0] ?? '';
    for (let i = 0; i < values.length; i++) {
      query += `$${i + 1}${strings[i + 1] ?? ''}`;
    }
    return query;
  }),
  eq: jest.fn(),
  and: jest.fn(),
  desc: jest.fn(),
}));

import { PayrollService } from './payroll.service';

describe('PayrollService tenant-scoped queries', () => {
  const makeService = (executeResult: any = { rows: [] }) => {
    const execute = jest.fn().mockResolvedValue(executeResult);
    return {
      service: new PayrollService({ db: { execute } } as any),
      execute,
    };
  };

  it('getPayslips joins users with tenant filter', async () => {
    const { service, execute } = makeService();

    await service.getPayslips('tenant-1', 'board-1');

    expect(execute).toHaveBeenCalledTimes(1);
    const query = execute.mock.calls[0][0] as string;
    expect(query).toContain('JOIN users u ON u.id = p.employee_id AND u.tenant_id = $1');
    expect(query).toContain('WHERE p.tenant_id = $2 AND p.board_id = $3');
  });
});
