import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { QmsController } from './qms.controller';
import { GetQualityReportQueryDto } from './dto';

describe('QmsController issue #326 — GET /qms/report date validation', () => {
  const mockService = { getQualityReport: jest.fn() };
  let controller: QmsController;

  beforeEach(() => {
    mockService.getQualityReport.mockClear();
    controller = new QmsController(mockService as any);
  });

  describe('GetQualityReportQueryDto', () => {
    it('accepts valid ISO date strings', async () => {
      const dto = new GetQualityReportQueryDto();
      dto.startDate = '2026-01-01';
      dto.endDate = '2026-01-31';
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects an invalid startDate', async () => {
      const dto = new GetQualityReportQueryDto();
      dto.startDate = 'not-a-date';
      dto.endDate = '2026-01-31';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'startDate')).toBe(true);
    });

    it('rejects an invalid endDate', async () => {
      const dto = new GetQualityReportQueryDto();
      dto.startDate = '2026-01-01';
      dto.endDate = 'also-bad';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'endDate')).toBe(true);
    });

    it('rejects non-ISO date formats', async () => {
      const dto = new GetQualityReportQueryDto();
      dto.startDate = '01/01/2026';
      dto.endDate = '2026-01-31';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'startDate')).toBe(true);
    });
  });

  describe('getQualityReport', () => {
    it('throws BadRequestException when startDate is after endDate', async () => {
      const query = { startDate: '2026-02-01', endDate: '2026-01-01' };
      await expect(
        controller.getQualityReport({ user: { tenantId: 'tenant-1' } } as any, query as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws with the expected message when startDate is after endDate', async () => {
      const query = { startDate: '2026-02-01', endDate: '2026-01-01' };
      await expect(
        controller.getQualityReport({ user: { tenantId: 'tenant-1' } } as any, query as any),
      ).rejects.toThrow('startDate must be before or equal to endDate');
    });

    it('calls the service with parsed Date objects when the range is valid', async () => {
      const query = { startDate: '2026-01-01', endDate: '2026-01-31' };
      await controller.getQualityReport({ user: { tenantId: 'tenant-1' } } as any, query as any);
      expect(mockService.getQualityReport).toHaveBeenCalledWith(
        'tenant-1',
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );
    });
  });
});
