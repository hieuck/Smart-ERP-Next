const mockDb = {
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));
jest.mock('@smart-erp/database/schema', () => ({
  employeeKpiTargets: {
    actualValue: 'employeeKpiTargets.actualValue',
    employeeId: 'employeeKpiTargets.employeeId',
    id: 'employeeKpiTargets.id',
    kpiId: 'employeeKpiTargets.kpiId',
    period: 'employeeKpiTargets.period',
    score: 'employeeKpiTargets.score',
    status: 'employeeKpiTargets.status',
    targetValue: 'employeeKpiTargets.targetValue',
    tenantId: 'employeeKpiTargets.tenantId',
  },
  kpiDefinitions: { id: 'kpiDefinitions.id', name: 'kpiDefinitions.name' },
  performanceReviews: {},
}));
jest.mock('@smart-erp/database/drizzle', () => ({
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
}));

import { NotFoundException } from '@nestjs/common';
import { PerformanceService } from './performance.service';

const selectChain = (rows: any[], terminal: 'orderBy' | 'where' = 'orderBy') => {
  const chain: any = {
    from: jest.fn(() => chain),
    innerJoin: jest.fn(() => chain),
    orderBy: jest.fn(() => Promise.resolve(rows)),
    where: jest.fn(() => (terminal === 'where' ? Promise.resolve(rows) : chain)),
  };
  return chain;
};
const writeChain = (rows: any[]) => {
  const chain: any = {
    returning: jest.fn(() => Promise.resolve(rows)),
    set: jest.fn(() => chain),
    values: jest.fn(() => chain),
    where: jest.fn(() => chain),
  };
  return chain;
};

describe('PerformanceService coverage', () => {
  const service = new PerformanceService();

  beforeEach(() => jest.clearAllMocks());

  it('loads employee KPIs with optional periods', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain([{ id: 'target-1' }]))
      .mockReturnValueOnce(selectChain([{ id: 'target-2' }]));

    await expect(service.getEmployeeKPIs('tenant-1', 'employee-1')).resolves.toEqual([{ id: 'target-1' }]);
    await expect(service.getEmployeeKPIs('tenant-1', 'employee-1', '2026-Q2')).resolves.toEqual([{ id: 'target-2' }]);
  });

  it('updates KPI progress with capped score and rejects missing targets', async () => {
    const update = writeChain([{ id: 'target-1', score: '120' }]);
    mockDb.select.mockReturnValueOnce(selectChain([{ id: 'target-1', targetValue: '100' }], 'where')).mockReturnValueOnce(selectChain([], 'where'));
    mockDb.update.mockReturnValueOnce(update);

    await expect(service.updateKpiProgress('tenant-1', 'employee-1', 'target-1', 150)).resolves.toEqual({
      id: 'target-1',
      score: '120',
    });
    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({ actualValue: '150', score: '120', updatedAt: expect.any(Date) }),
    );
    await expect(service.updateKpiProgress('tenant-1', 'employee-1', 'missing', 10)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates performance reviews', async () => {
    const insert = writeChain([{ id: 'review-1' }]);
    mockDb.insert.mockReturnValueOnce(insert);

    await expect(service.createPerformanceReview('tenant-1', { employeeId: 'employee-1' })).resolves.toEqual({
      id: 'review-1',
    });
    expect(insert.values).toHaveBeenCalledWith({ employeeId: 'employee-1', tenantId: 'tenant-1' });
  });
});
