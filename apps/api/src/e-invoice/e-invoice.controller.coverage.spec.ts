import { ParseUUIDPipe } from '@nestjs/common';
import { EInvoiceController } from './e-invoice.controller';
import { EInvoiceService } from './e-invoice.service';

describe('EInvoiceController', () => {
  const tenantId = 'tenant-1';
  const user = { sub: 'user-1', tenantId };
  const statsResult = { issued_count: 5, total_revenue: '1000000' };
  const invoiceResult = { id: '550e8400-e29b-41d4-a716-446655440000', items: [] };

  const service = {
    findById: jest.fn().mockResolvedValue(invoiceResult),
    getStats: jest.fn().mockResolvedValue(statsResult),
  } as unknown as EInvoiceService;

  const controller = new EInvoiceController(service);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes stats/monthly before :id so monthly stats are reachable', async () => {
    const req = { user };
    const result = await controller.getStats(req, '2026', '7');

    expect(service.getStats).toHaveBeenCalledWith(tenantId, 2026, 7);
    expect(result).toEqual(statsResult);
  });

  it('validates :id with ParseUUIDPipe', async () => {
    const req = { user };
    const validId = '550e8400-e29b-41d4-a716-446655440000';

    const result = await controller.findById(req, validId);

    expect(service.findById).toHaveBeenCalledWith(tenantId, validId);
    expect(result).toEqual(invoiceResult);
  });

  it('throws for non-UUID id parameter', async () => {
    const pipe = new ParseUUIDPipe();
    await expect(pipe.transform('stats/monthly', { type: 'param', metatype: String, data: 'id' })).rejects.toThrow();
  });
});
