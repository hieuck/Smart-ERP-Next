jest.mock('../../drizzle/drizzle.service', () => ({
  DrizzleService: jest.fn().mockImplementation(function (this: any, db: any) {
    this.db = db;
  }),
}));

jest.mock('@smart-erp/database', () => ({
  attendanceRecords: {},
  attendanceCheckIn: {},
  leaveRequests: {},
  workShifts: {},
  users: {},
}));

jest.mock('drizzle-orm', () => ({
  sql: jest.fn((strings: TemplateStringsArray, ...values: any[]) => {
    let query = strings[0] ?? '';
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      // Inline previously built SQL strings so nested sql`` calls compose.
      if (typeof value === 'string' && /FROM|SELECT|WHERE|JOIN|ORDER BY/i.test(value)) {
        query += value;
      } else {
        query += `$${i + 1}`;
      }
      query += strings[i + 1] ?? '';
    }
    return query;
  }),
  eq: jest.fn(),
  and: jest.fn(),
  desc: jest.fn(),
  asc: jest.fn(),
}));

import { AttendanceService } from './attendance.service';

describe('AttendanceService tenant-scoped user JOINs', () => {
  const makeService = (executeResult: any = { rows: [] }) => {
    const execute = jest.fn().mockResolvedValue(executeResult);
    return {
      service: new AttendanceService({ db: { execute } } as any),
      execute,
    };
  };

  it('listRecords joins users with tenant filter', async () => {
    const { service, execute } = makeService();

    await service.listRecords('tenant-1');

    expect(execute).toHaveBeenCalledTimes(1);
    const query = execute.mock.calls[0][0] as string;
    expect(query).toMatch(/LEFT JOIN users u ON u\.id = a\.employee_id AND u\.tenant_id = \$\d+/);
    expect(query).toMatch(/WHERE a\.tenant_id = \$\d+/);
  });

  it('listLeaveRequests joins users with tenant filter', async () => {
    const { service, execute } = makeService();

    await service.listLeaveRequests('tenant-1');

    expect(execute).toHaveBeenCalledTimes(1);
    const query = execute.mock.calls[0][0] as string;
    expect(query).toMatch(/LEFT JOIN users u ON u\.id = lr\.employee_id AND u\.tenant_id = \$\d+/);
    expect(query).toMatch(/WHERE lr\.tenant_id = \$\d+/);
  });
});
