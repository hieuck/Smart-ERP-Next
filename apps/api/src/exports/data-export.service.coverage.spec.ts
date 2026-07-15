import { NotFoundException } from '@nestjs/common';
import { ExportFormat } from './export.enums';
import { DataExportService } from './data-export.service';

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: (col: any, val: any) => ({ op: 'eq', col, val }),
  and: (...conds: any[]) => ({ op: 'and', conds }),
  gte: (col: any, val: any) => ({ op: 'gte', col, val }),
  lte: (col: any, val: any) => ({ op: 'lte', col, val }),
}));

describe('DataExportService coverage', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z')));
  afterEach(() => jest.useRealTimers());

  it('creates export jobs, reports unknown jobs as 404, and lists entity catalog entries', async () => {
    const service = new DataExportService({} as any);

    const job = await service.createExportJob('tenant-1', ExportFormat.JSON, ['orders']);
    expect(job).toMatchObject({
      createdAt: '2026-05-21T00:00:00.000Z',
      entities: ['orders'],
      format: ExportFormat.JSON,
      status: 'pending',
      tenantId: 'tenant-1',
    });
    expect(job.id).toBeDefined();

    await expect(service.getExportStatus('tenant-1', 'unknown-job')).rejects.toThrow(NotFoundException);
    await expect(service.getExportFile('tenant-1', 'unknown-job')).rejects.toThrow(NotFoundException);

    expect(service.getExportableEntities().map((entity) => entity.key)).toEqual(
      expect.arrayContaining(['customers', 'products', 'orders', 'crm']),
    );
  });

  describe('job persistence', () => {
    it('createExportJob returns a persisted job that can be retrieved by getExportStatus and getExportFile', async () => {
      const mockWhere = jest.fn().mockResolvedValue([]);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
      const drizzle = { db: { select: mockSelect } } as any;
      const service = new DataExportService(drizzle);

      const job = await service.createExportJob('tenant-p', ExportFormat.JSON, ['customers']);
      expect(job.id).toBeDefined();
      expect(job.tenantId).toBe('tenant-p');

      const status = await service.getExportStatus('tenant-p', job.id as string);
      expect(status.id).toBe(job.id);
      expect(status.tenantId).toBe('tenant-p');
      expect(status.entities).toEqual(['customers']);

      const file = await service.getExportFile('tenant-p', job.id as string);
      expect(Buffer.isBuffer(file)).toBe(true);
      expect(status.id).toBe(job.id);
    });

    it('does not allow cross-tenant access', async () => {
      const service = new DataExportService({} as any);
      const job = await service.createExportJob('tenant-a', ExportFormat.JSON, ['orders']);
      await expect(service.getExportStatus('tenant-b', job.id as string)).rejects.toThrow(NotFoundException);
      await expect(service.getExportFile('tenant-b', job.id as string)).rejects.toThrow(NotFoundException);
    });
  });

  describe('exportData filters', () => {
    it('filters rows by dateFrom and dateTo when filters are provided', async () => {
      const mockWhere = jest.fn().mockResolvedValue([{ id: 'row-1', tenantId: 't1', createdAt: '2024-06-15' }]);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
      const drizzle = { db: { select: mockSelect } } as any;
      const service = new DataExportService(drizzle);

      await service.exportData(
        't1',
        ExportFormat.JSON,
        ['orders'],
        { dateFrom: '2024-06-01', dateTo: '2024-06-30' },
      );

      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();

      const whereClause = mockWhere.mock.calls[0][0];
      expect(whereClause).toBeDefined();
      expect(whereClause.op).toBe('and');
      expect(whereClause.conds).toHaveLength(3);
      const values = whereClause.conds.map((c: any) => c.val);
      expect(values).toContain('t1');
      expect(values).toContain('2024-06-01');
      expect(values).toContain('2024-06-30');
    });

    it('applies only tenant filter when date range is omitted', async () => {
      const mockWhere = jest.fn().mockResolvedValue([{ id: 'row-1', tenantId: 't1' }]);
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
      const drizzle = { db: { select: mockSelect } } as any;
      const service = new DataExportService(drizzle);

      await service.exportData('t1', ExportFormat.JSON, ['orders']);

      const whereClause = mockWhere.mock.calls[0][0];
      expect(whereClause.op).toBe('and');
      expect(whereClause.conds).toHaveLength(1);
      expect(whereClause.conds[0].op).toBe('eq');
      expect(whereClause.conds[0].val).toBe('t1');
    });
  });
});
