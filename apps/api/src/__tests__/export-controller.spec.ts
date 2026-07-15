import { ExportController } from '../exports/export.controller';
import { ExportFormat } from '../exports/export.enums';

describe('ExportController', () => {
  let controller: ExportController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      getExportableEntities: jest.fn(),
      createExportJob: jest.fn(),
      getExportStatus: jest.fn(),
      getExportFile: jest.fn(),
    };
    controller = new (ExportController as any)(mockService) as ExportController;
  });

  describe('GET /entities', () => {
    it('returns entity list', () => {
      const entities = [
        { key: 'customers', label: 'Customers' },
        { key: 'products', label: 'Products' },
      ];
      mockService.getExportableEntities.mockReturnValue(entities);

      const result = controller.getExportableEntities();

      expect(result).toEqual(entities);
      expect(mockService.getExportableEntities).toHaveBeenCalled();
    });
  });

  describe('POST /exports', () => {
    it('calls createExportJob with CSV format and correct params', async () => {
      const req = { user: { tenantId: 'tenant-1' } };
      const body = { format: ExportFormat.CSV, entities: ['customers', 'products'] };
      const expected = {
        id: 'job-1',
        status: 'pending',
        tenantId: 'tenant-1',
        format: ExportFormat.CSV,
        entities: ['customers', 'products'],
        createdAt: '2026-05-21T00:00:00.000Z',
      };
      mockService.createExportJob.mockResolvedValue(expected);

      const result = await controller.createExport(req as any, body as any);

      expect(mockService.createExportJob).toHaveBeenCalledWith('tenant-1', ExportFormat.CSV, ['customers', 'products'], {
        dateFrom: undefined,
        dateTo: undefined,
      });
      expect(result).toEqual(expected);
    });

    it('calls createExportJob with JSON format and date filters', async () => {
      const req = { user: { tenantId: 'tenant-2' } };
      const body = { format: ExportFormat.JSON, entities: ['orders'], dateFrom: '2024-06-01', dateTo: '2024-06-30' };
      const expected = {
        id: 'job-2',
        status: 'pending',
        tenantId: 'tenant-2',
        format: ExportFormat.JSON,
        entities: ['orders'],
        createdAt: '2026-05-21T00:00:00.000Z',
      };
      mockService.createExportJob.mockResolvedValue(expected);

      const result = await controller.createExport(req as any, body as any);

      expect(mockService.createExportJob).toHaveBeenCalledWith('tenant-2', ExportFormat.JSON, ['orders'], {
        dateFrom: '2024-06-01',
        dateTo: '2024-06-30',
      });
      expect(result).toEqual(expected);
    });
  });

  describe('GET /:id/status', () => {
    it('returns status for a job', async () => {
      const req = { user: { tenantId: 'tenant-1' } };
      const expected = { id: 'job-1', status: 'completed' };
      mockService.getExportStatus.mockResolvedValue(expected);

      const result = await controller.getExportStatus(req as any, 'job-1');

      expect(mockService.getExportStatus).toHaveBeenCalledWith('tenant-1', 'job-1');
      expect(result).toEqual(expected);
    });
  });

  describe('GET /:id/download', () => {
    it('returns buffer with correct headers', async () => {
      const req = { user: { tenantId: 'tenant-1' } };
      const res = { setHeader: jest.fn(), send: jest.fn() };
      mockService.getExportFile.mockResolvedValue(Buffer.from('col1,col2\nval1,val2'));
      mockService.getExportStatus.mockResolvedValue({ id: 'job-1', format: ExportFormat.CSV, status: 'completed' });

      await controller.downloadExport(req as any, 'job-1', res as any);

      expect(mockService.getExportFile).toHaveBeenCalledWith('tenant-1', 'job-1');
      expect(mockService.getExportStatus).toHaveBeenCalledWith('tenant-1', 'job-1');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="export-job-1.csv"');
      expect(res.send).toHaveBeenCalledWith(Buffer.from('col1,col2\nval1,val2'));
    });
  });
});
