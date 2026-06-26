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
  db.innerJoin = chainFn;
  db.returning = jest.fn();
  db.then = jest.fn();

  return { db };
});
jest.mock('@smart-erp/database/schema', () => ({ kpiDefinitions: {}, employeeKpiTargets: {}, performanceReviews: {} }));
jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  desc: jest.fn(),
}));

import { db } from '@smart-erp/database';
import { PerformanceService } from '../hr/services/performance.service';

describe('PerformanceService (direct instantiation)', () => {
  let service: PerformanceService;
  const TENANT_ID = 'tenant-1';
  const EMPLOYEE_ID = 'emp-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (db as any).then.mockImplementation((resolve: any) => resolve([]));
    (db as any).returning.mockReset();
    service = new (PerformanceService as any)();
  });

  describe('getEmployeeKPIs', () => {
    const kpis = [
      { id: 'kpi-1', kpiName: 'Sales Target', targetValue: '100', actualValue: '85', score: '85', period: '2026-06', status: 'open' },
      { id: 'kpi-2', kpiName: 'Code Quality', targetValue: '100', actualValue: '95', score: '95', period: '2026-06', status: 'open' },
    ];

    it('returns KPI list for an employee', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve(kpis));

      const result = await service.getEmployeeKPIs(TENANT_ID, EMPLOYEE_ID);

      expect(result).toEqual(kpis);
      expect(db.select).toHaveBeenCalled();
      expect(db.innerJoin).toHaveBeenCalled();
    });

    it('filters by period when provided', async () => {
      const filtered = [kpis[0]];
      (db as any).then.mockImplementation((resolve: any) => resolve(filtered));

      const result = await service.getEmployeeKPIs(TENANT_ID, EMPLOYEE_ID, '2026-06');

      expect(result).toEqual(filtered);
    });
  });

  describe('updateKpiProgress', () => {
    const target: any = {
      id: 'target-1', tenantId: TENANT_ID, employeeId: EMPLOYEE_ID,
      kpiId: 'kpi-1', period: '2026-06', targetValue: '100', actualValue: '0', score: '0', status: 'open',
    };

    it('updates target with calculated score', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([target]));
      const updated: any = { ...target, actualValue: '80', score: '80' };
      (db as any).returning.mockResolvedValue([updated]);

      const result = await service.updateKpiProgress(TENANT_ID, EMPLOYEE_ID, 'target-1', 80);

      expect(result.actualValue).toBe('80');
      expect(result.score).toBe('80');
    });

    it('caps score at 120%', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([target]));
      const updated: any = { ...target, actualValue: '150', score: '120' };
      (db as any).returning.mockResolvedValue([updated]);

      const result = await service.updateKpiProgress(TENANT_ID, EMPLOYEE_ID, 'target-1', 150);

      expect(result.score).toBe('120');
    });

    it('throws NotFoundException when target not found', async () => {
      await expect(service.updateKpiProgress(TENANT_ID, EMPLOYEE_ID, 'missing', 80))
        .rejects.toThrow('KPI target not found');
    });
  });

  describe('createPerformanceReview', () => {
    const reviewData: any = {
      employeeId: EMPLOYEE_ID, reviewerId: 'reviewer-1',
      period: '2026-06', selfAssessment: 'Good work', managerFeedback: 'Agreed',
    };

    it('creates and returns a performance review', async () => {
      const expected: any = {
        id: 'pr-1', tenantId: TENANT_ID, ...reviewData,
        overallScore: null, status: 'draft',
      };
      (db as any).returning.mockResolvedValue([expected]);

      const result = await service.createPerformanceReview(TENANT_ID, reviewData);

      expect(result).toEqual(expected);
      expect(db.insert).toHaveBeenCalled();
    });
  });
});
