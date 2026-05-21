const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  qmsInspectionPlans: { tenantId: 'qmsInspectionPlans.tenantId', productId: 'qmsInspectionPlans.productId' },
  qmsInspections: {
    tenantId: 'qmsInspections.tenantId',
    referenceType: 'qmsInspections.referenceType',
    referenceId: 'qmsInspections.referenceId',
    inspectionDate: 'qmsInspections.inspectionDate',
  },
  qmsNcrs: { tenantId: 'qmsNcrs.tenantId', status: 'qmsNcrs.status', reportedAt: 'qmsNcrs.reportedAt' },
  products: {},
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { QmsService } from './qms.service';

const selectQueue: any[][] = [];
const returningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => Promise.resolve(rows)),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeInsertChain = () => {
  const chain: any = {
    values: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
  };
  return chain;
};

describe('QmsService coverage', () => {
  let service: QmsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeInsertChain());
    service = new QmsService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('creates plans and filters plan/inspection/NCR lists', async () => {
    returningQueue.push([{ id: 'plan-1', tenantId: 'tenant-1' }]);
    await expect(service.createPlan('tenant-1', { productId: 'product-1' })).resolves.toEqual({ id: 'plan-1', tenantId: 'tenant-1' });

    selectQueue.push([{ id: 'plan-1' }], [{ id: 'inspection-1' }], [{ id: 'ncr-1' }]);
    await expect(service.getPlans('tenant-1', 'product-1')).resolves.toEqual([{ id: 'plan-1' }]);
    await expect(service.getInspections('tenant-1', 'po', 'po-1')).resolves.toEqual([{ id: 'inspection-1' }]);
    await expect(service.getNCRs('tenant-1', 'open')).resolves.toEqual([{ id: 'ncr-1' }]);
  });

  it('records failing inspections and creates an NCR automatically', async () => {
    returningQueue.push([{ id: 'inspection-1', verdict: 'fail' }], [{ id: 'ncr-1', code: 'NCR-SAZY2O0' }]);

    await expect(service.recordInspection('tenant-1', 'user-1', {
      verdict: 'fail',
      productId: 'product-1',
      notes: 'Scratch',
    })).resolves.toEqual({ id: 'inspection-1', verdict: 'fail' });

    expect(mockDb.insert).toHaveBeenCalledTimes(2);
    expect(mockDb.insert.mock.results[1].value.values).toHaveBeenCalledWith(expect.objectContaining({
      defectCode: 'INSP-FAIL',
      description: 'Failed inspection: Scratch',
      severity: 'high',
      reportedBy: 'user-1',
    }));

    returningQueue.push([{ id: 'inspection-2', verdict: 'fail' }], [{ id: 'ncr-2', code: 'NCR-DEFAULT' }]);
    await expect(service.recordInspection('tenant-1', 'user-1', {
      verdict: 'fail',
    })).resolves.toEqual({ id: 'inspection-2', verdict: 'fail' });
    expect(mockDb.insert.mock.results[3].value.values).toHaveBeenCalledWith(expect.objectContaining({
      productId: null,
      description: 'Failed inspection: No notes',
    }));
  });

  it('returns QMS placeholder analytics and setup helpers', async () => {
    await expect(service.createCAPA('tenant-1', 'user-1', { title: 'Fix process' })).resolves.toMatchObject({
      tenantId: 'tenant-1',
      userId: 'user-1',
      status: 'open',
    });
    await expect(service.getCAPAs('tenant-1', 'ncr-1')).resolves.toEqual([
      expect.objectContaining({ ncrId: 'ncr-1', status: 'in_progress' }),
    ]);
    await expect(service.completeCAPA('tenant-1', 'capa-1', 'user-1')).resolves.toMatchObject({
      id: 'capa-1',
      status: 'completed',
      completedBy: 'user-1',
    });
    await expect(service.createDefectCode('tenant-1', { code: 'PKG-DMG' })).resolves.toMatchObject({ tenantId: 'tenant-1', code: 'PKG-DMG' });
    await expect(service.getDefectCodes('tenant-1')).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INSP-FAIL' }),
    ]));
    await expect(service.getQualityReport('tenant-1', new Date('2026-05-01'), new Date('2026-05-31'))).resolves.toMatchObject({ totalInspections: 45 });
    await expect(service.getSupplierQualityScore('tenant-1', 'supplier-1')).resolves.toMatchObject({ score: 92.5 });
    await expect(service.getSupplierQualityReport('tenant-1')).resolves.toHaveLength(3);
  });
});
