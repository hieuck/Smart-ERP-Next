jest.mock('@smart-erp/database', () => ({
  reportTemplates: { tenantId: 'reportTemplates.tenantId', id: 'reportTemplates.id' },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: Object.assign(
    jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
    { raw: jest.fn((value) => ({ op: 'raw', value })) },
  ),
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReportEngineService } from './report-engine.service';

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeInsertChain = (returningQueue: any[][]) => {
  const chain: any = {
    values: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
  };
  return chain;
};

describe('ReportEngineService coverage', () => {
  const selectQueue: any[][] = [];
  const returningQueue: any[][] = [];
  const drizzle = {
    db: {
      insert: jest.fn(() => makeInsertChain(returningQueue)),
      select: jest.fn(() => makeSelectChain(selectQueue.shift() ?? [])),
      execute: jest.fn(),
    },
  };
  let service: ReportEngineService;

  beforeEach(() => {
    jest.clearAllMocks();
    selectQueue.length = 0;
    returningQueue.length = 0;
    service = new ReportEngineService(drizzle as any);
  });

  it('creates and reads report templates', async () => {
    returningQueue.push([{ id: 'template-1', name: 'Revenue' }]);
    await expect(service.createTemplate('tenant-1', {
      name: 'Revenue',
      description: 'Monthly revenue',
      querySql: 'select * from orders',
      parameters: {},
      outputSchema: {},
      isSystem: true,
    })).resolves.toEqual({ id: 'template-1', name: 'Revenue' });

    returningQueue.push([{ id: 'template-default', name: 'Ad hoc' }]);
    await expect(service.createTemplate('tenant-1', {
      name: 'Ad hoc',
      querySql: 'select 1',
      parameters: {},
      outputSchema: {},
    })).resolves.toEqual({ id: 'template-default', name: 'Ad hoc' });
    expect(drizzle.db.insert.mock.results[1].value.values).toHaveBeenCalledWith(expect.objectContaining({
      isSystem: false,
    }));

    selectQueue.push([{ id: 'template-1' }], [], [{ id: 'template-1', querySql: 'select * from orders where tenant_id = :tenantId and code = :code and min_total > :min' }]);
    await expect(service.getAllTemplates('tenant-1')).resolves.toEqual([{ id: 'template-1' }]);
    await expect(service.getTemplate('tenant-1', 'missing')).rejects.toBeInstanceOf(BadRequestException);

    drizzle.db.execute.mockResolvedValueOnce({ rows: [{ id: 'row-1' }] });
    await expect(service.runTemplate('tenant-1', 'template-1', { code: "A'B", min: 10 })).resolves.toEqual([{ id: 'row-1' }]);
    expect(drizzle.db.execute).toHaveBeenCalledWith(expect.objectContaining({ op: 'raw' }));
    expect(ReportEngineService.getRevenueReportSql()).toContain('date_trunc');
  });

  it('rejects non-SELECT SQL when creating templates', async () => {
    await expect(service.createTemplate('tenant-1', {
      name: 'Bad',
      querySql: "DELETE FROM orders WHERE tenant_id = 't1'",
      parameters: {},
      outputSchema: {},
    })).rejects.toBeInstanceOf(ForbiddenException);

    await expect(service.createTemplate('tenant-1', {
      name: 'Bad',
      querySql: "INSERT INTO orders (id) VALUES ('x')",
      parameters: {},
      outputSchema: {},
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects SQL accessing forbidden tables when creating templates', async () => {
    await expect(service.createTemplate('tenant-1', {
      name: 'Bad',
      querySql: 'SELECT * FROM users',
      parameters: {},
      outputSchema: {},
    })).rejects.toBeInstanceOf(ForbiddenException);

    await expect(service.createTemplate('tenant-1', {
      name: 'Bad',
      querySql: 'SELECT * FROM api_keys',
      parameters: {},
      outputSchema: {},
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects forbidden keywords in template SQL', async () => {
    await expect(service.createTemplate('tenant-1', {
      name: 'Bad',
      querySql: "SELECT * FROM orders; DROP TABLE orders;",
      parameters: {},
      outputSchema: {},
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('re-validates SQL at run time', async () => {
    // Template stored elsewhere may bypass create-time validation; run time must reject it.
    selectQueue.push([{ id: 'template-1', querySql: 'DELETE FROM orders' }]);

    await expect(service.runTemplate('tenant-1', 'template-1', {}))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
