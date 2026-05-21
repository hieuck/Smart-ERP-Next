import { ExportFormat } from './export.enums';
import { DataExportService } from './data-export.service';

describe('DataExportService coverage', () => {
  const service = new DataExportService({} as any);

  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z')));
  afterEach(() => jest.useRealTimers());

  it('creates export jobs, status payloads, files, and entity catalog entries', async () => {
    await expect(service.createExportJob('tenant-1', ExportFormat.JSON, ['orders'])).resolves.toEqual({
      createdAt: '2026-05-21T00:00:00.000Z',
      entities: ['orders'],
      format: ExportFormat.JSON,
      status: 'pending',
      tenantId: 'tenant-1',
    });
    await expect(service.getExportStatus('tenant-1', 'job-1')).resolves.toMatchObject({
      entities: ['customers', 'products'],
      fileSize: 524288,
      id: 'job-1',
      status: 'completed',
      tenantId: 'tenant-1',
    });
    await expect(service.getExportFile('tenant-1', 'job-1')).resolves.toEqual(
      Buffer.from(JSON.stringify({ exportDate: '2026-05-21T00:00:00.000Z', tenantId: 'tenant-1' })),
    );
    expect(service.getExportableEntities().map((entity) => entity.key)).toEqual(
      expect.arrayContaining(['customers', 'products', 'orders', 'crm']),
    );
  });
});
