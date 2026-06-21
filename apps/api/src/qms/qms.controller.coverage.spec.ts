import { QmsController } from './qms.controller';

describe('QmsController', () => {
  let controller: QmsController;
  let mockService: Record<string, jest.Mock>;

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  beforeEach(() => {
    mockService = {
      createPlan: jest.fn(),
      getPlans: jest.fn(),
      recordInspection: jest.fn(),
      getInspections: jest.fn(),
      createNCR: jest.fn(),
      getNCRs: jest.fn(),
      createCAPA: jest.fn(),
      getCAPAs: jest.fn(),
      completeCAPA: jest.fn(),
      createDefectCode: jest.fn(),
      getDefectCodes: jest.fn(),
      getQualityReport: jest.fn(),
      getSupplierQualityScore: jest.fn(),
      getSupplierQualityReport: jest.fn(),
    };
    controller = new QmsController(mockService as any);
  });

  it('createPlan delegates to service.createPlan', async () => {
    mockService.createPlan.mockResolvedValue('plan');
    const body = { productId: 'p1', name: 'Inspection Plan A' };
    const result = await controller.createPlan(req, body);
    expect(mockService.createPlan).toHaveBeenCalledWith('t1', body);
    expect(result).toBe('plan');
  });

  it('getPlans delegates to service.getPlans', async () => {
    mockService.getPlans.mockResolvedValue(['plan']);
    const result = await controller.getPlans(req, 'p1');
    expect(mockService.getPlans).toHaveBeenCalledWith('t1', 'p1');
    expect(result).toEqual(['plan']);
  });

  it('getPlans calls with undefined productId when not provided', async () => {
    mockService.getPlans.mockResolvedValue([]);
    await controller.getPlans(req);
    expect(mockService.getPlans).toHaveBeenCalledWith('t1', undefined);
  });

  it('recordInspection delegates to service.recordInspection', async () => {
    mockService.recordInspection.mockResolvedValue('inspection');
    const body = { referenceType: 'order', referenceId: 'r1', results: [{ passed: true }] };
    const result = await controller.recordInspection(req, body);
    expect(mockService.recordInspection).toHaveBeenCalledWith('t1', 'u1', {
      referenceType: 'order',
      referenceId: 'r1',
      results: [{ passed: true }],
    });
    expect(result).toBe('inspection');
  });

  it('getInspections delegates to service.getInspections', async () => {
    mockService.getInspections.mockResolvedValue(['inspection']);
    const result = await controller.getInspections(req, 'order', 'r1');
    expect(mockService.getInspections).toHaveBeenCalledWith('t1', 'order', 'r1');
    expect(result).toEqual(['inspection']);
  });

  it('createNCR delegates to service.createNCR', async () => {
    mockService.createNCR.mockResolvedValue('ncr');
    const body = { productionOrderId: 'po1', productId: 'p1', defectCode: 'DC01', description: 'defect' };
    const result = await controller.createNCR(req, body);
    expect(mockService.createNCR).toHaveBeenCalledWith('t1', 'u1', body);
    expect(result).toBe('ncr');
  });

  it('getNCRs delegates to service.getNCRs', async () => {
    mockService.getNCRs.mockResolvedValue(['ncr']);
    const result = await controller.getNCRs(req, 'open');
    expect(mockService.getNCRs).toHaveBeenCalledWith('t1', 'open');
    expect(result).toEqual(['ncr']);
  });

  it('createCAPA delegates to service.createCAPA', async () => {
    mockService.createCAPA.mockResolvedValue('capa');
    const body = { ncrId: 'n1', type: 'corrective' as const, action: 'Fix it' };
    const result = await controller.createCAPA(req, body);
    expect(mockService.createCAPA).toHaveBeenCalledWith('t1', 'u1', body);
    expect(result).toBe('capa');
  });

  it('getCAPAs delegates to service.getCAPAs', async () => {
    mockService.getCAPAs.mockResolvedValue(['capa']);
    const result = await controller.getCAPAs(req, 'n1');
    expect(mockService.getCAPAs).toHaveBeenCalledWith('t1', 'n1');
    expect(result).toEqual(['capa']);
  });

  it('completeCAPA delegates to service.completeCAPA', async () => {
    mockService.completeCAPA.mockResolvedValue('completed');
    const result = await controller.completeCAPA(req, 'capa-1');
    expect(mockService.completeCAPA).toHaveBeenCalledWith('t1', 'capa-1', 'u1');
    expect(result).toBe('completed');
  });

  it('createDefectCode delegates to service.createDefectCode', async () => {
    mockService.createDefectCode.mockResolvedValue('dc');
    const body = { code: 'DC01', description: 'Scratch' };
    const result = await controller.createDefectCode(req, body);
    expect(mockService.createDefectCode).toHaveBeenCalledWith('t1', body);
    expect(result).toBe('dc');
  });

  it('getDefectCodes delegates to service.getDefectCodes', async () => {
    mockService.getDefectCodes.mockResolvedValue(['dc']);
    const result = await controller.getDefectCodes(req);
    expect(mockService.getDefectCodes).toHaveBeenCalledWith('t1');
    expect(result).toEqual(['dc']);
  });

  it('getQualityReport delegates to service.getQualityReport', async () => {
    mockService.getQualityReport.mockResolvedValue('report');
    const result = await controller.getQualityReport(req, '2024-01-01', '2024-01-31');
    expect(mockService.getQualityReport).toHaveBeenCalledWith('t1', new Date('2024-01-01'), new Date('2024-01-31'));
    expect(result).toBe('report');
  });

  it('getSupplierScore delegates to service.getSupplierQualityScore', async () => {
    mockService.getSupplierQualityScore.mockResolvedValue(95);
    const result = await controller.getSupplierScore(req, 's1');
    expect(mockService.getSupplierQualityScore).toHaveBeenCalledWith('t1', 's1');
    expect(result).toBe(95);
  });

  it('getSupplierReport delegates to service.getSupplierQualityReport', async () => {
    mockService.getSupplierQualityReport.mockResolvedValue('supplier-report');
    const result = await controller.getSupplierReport(req);
    expect(mockService.getSupplierQualityReport).toHaveBeenCalledWith('t1');
    expect(result).toBe('supplier-report');
  });
});
