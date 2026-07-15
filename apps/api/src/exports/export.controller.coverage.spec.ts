import { NotFoundException } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportFormat } from './export.enums';

describe('ExportController', () => {
  let svc: any;
  let ctrl: ExportController;

  beforeEach(() => {
    svc = {
      getExportableEntities: jest.fn(),
      exportData: jest.fn(),
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

  it('createExport validates the body with a NestJS DTO and calls service.createExportJob', async () => {
    const job = {
      id: 'job-1',
      tenantId: 't1',
      status: 'pending',
      format: ExportFormat.JSON,
      entities: ['customers', 'products'],
      createdAt: new Date().toISOString(),
    };
    svc.createExportJob.mockResolvedValue(job);

    const body = {
      format: ExportFormat.JSON,
      entities: ['customers', 'products'],
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
    };

    const r = await ctrl.createExport(req, body as any);

    expect(svc.createExportJob).toHaveBeenCalledWith(
      't1',
      ExportFormat.JSON,
      ['customers', 'products'],
      { dateFrom: '2024-01-01', dateTo: '2024-01-31' },
    );
    expect(svc.exportData).not.toHaveBeenCalled();
    expect(r).toEqual(job);
  });

  it('getExportStatus still delegates to service.getExportStatus', async () => {
    svc.getExportStatus.mockResolvedValue({ id: 'exp1', status: 'completed' });
    const r = await ctrl.getExportStatus(req, 'exp1');
    expect(svc.getExportStatus).toHaveBeenCalledWith('t1', 'exp1');
    expect(r).toEqual({ id: 'exp1', status: 'completed' });
  });

  it('downloadExport calls service.getExportFile and streams the returned Buffer', async () => {
    const buffer = Buffer.from('{"hello":"world"}');
    svc.getExportFile.mockResolvedValue(buffer);
    const res = { setHeader: jest.fn(), send: jest.fn() };

    await ctrl.downloadExport(req, 'job-1', ExportFormat.JSON, res as any);

    expect(svc.getExportFile).toHaveBeenCalledWith('t1', 'job-1');
    expect(svc.exportData).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringMatching(/attachment; filename="export-job-1\.json"/),
    );
    expect(res.send).toHaveBeenCalledWith(buffer);
  });

  it('downloadExport returns 404 if service.getExportFile throws NotFoundException', async () => {
    svc.getExportFile.mockRejectedValue(new NotFoundException('Export job not found'));
    const res = { setHeader: jest.fn(), send: jest.fn(), status: jest.fn().mockReturnThis() };

    await expect(ctrl.downloadExport(req, 'missing-job', ExportFormat.JSON, res as any)).rejects.toThrow(
      NotFoundException,
    );
    expect(svc.getExportFile).toHaveBeenCalledWith('t1', 'missing-job');
  });

  it('exercises a full create -> status -> download flow', async () => {
    const job = {
      id: 'job-flow-1',
      tenantId: 't1',
      status: 'completed',
      format: ExportFormat.CSV,
      entities: ['orders'],
      fileSize: 42,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    const buffer = Buffer.from('id,name\n1,Order 1');

    svc.createExportJob.mockResolvedValue(job);
    svc.getExportStatus.mockResolvedValue(job);
    svc.getExportFile.mockResolvedValue(buffer);

    const body = {
      format: ExportFormat.CSV,
      entities: ['orders'],
      dateFrom: '2024-06-01',
      dateTo: '2024-06-30',
    };

    const created = await ctrl.createExport(req, body as any);
    expect(created).toEqual(job);

    const status = await ctrl.getExportStatus(req, job.id);
    expect(status).toEqual(job);

    const res = { setHeader: jest.fn(), send: jest.fn() };
    await ctrl.downloadExport(req, job.id, ExportFormat.CSV, res as any);
    expect(svc.getExportFile).toHaveBeenCalledWith('t1', job.id);
    expect(res.send).toHaveBeenCalledWith(buffer);
  });
});
