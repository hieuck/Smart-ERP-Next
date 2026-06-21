import { ExportController } from './export.controller';

describe('ExportController', () => {
  let svc: any;
  let ctrl: ExportController;

  beforeEach(() => {
    svc = {
      getExportableEntities: jest.fn(),
      createExportJob: jest.fn(),
      getExportStatus: jest.fn(),
      getExportFile: jest.fn(),
    };
    ctrl = new ExportController(svc);
  });

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  it('getExportableEntities delegates to service', async () => {
    svc.getExportableEntities.mockResolvedValue(['customers', 'products']);
    const r = await ctrl.getExportableEntities();
    expect(svc.getExportableEntities).toHaveBeenCalledWith();
    expect(r).toEqual(['customers', 'products']);
  });

  it('createExport delegates to service', async () => {
    svc.createExportJob.mockResolvedValue({ id: 'exp1' });
    const body = { format: 'json' as const, entities: ['customers', 'products'], dateFrom: '2024-01-01' };
    const r = await ctrl.createExport(req, body);
    expect(svc.createExportJob).toHaveBeenCalledWith('t1', 'json', ['customers', 'products']);
    expect(r).toEqual({ id: 'exp1' });
  });

  it('getExportStatus delegates to service', async () => {
    svc.getExportStatus.mockResolvedValue({ id: 'exp1', status: 'completed' });
    const r = await ctrl.getExportStatus(req, 'exp1');
    expect(svc.getExportStatus).toHaveBeenCalledWith('t1', 'exp1');
    expect(r).toEqual({ id: 'exp1', status: 'completed' });
  });

  it('downloadExport delegates to service and streams response', async () => {
    const buffer = Buffer.from('test data');
    svc.getExportFile.mockResolvedValue(buffer);
    const res = { setHeader: jest.fn(), send: jest.fn() };
    await ctrl.downloadExport(req, 'exp1', res as any);
    expect(svc.getExportFile).toHaveBeenCalledWith('t1', 'exp1');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="export-exp1.json"');
    expect(res.send).toHaveBeenCalledWith(buffer);
  });
});
