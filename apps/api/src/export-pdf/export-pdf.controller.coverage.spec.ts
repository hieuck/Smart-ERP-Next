import { NotFoundException } from '@nestjs/common';
import { ExportPdfController } from './export-pdf.controller';

describe('ExportPdfController', () => {
  let controller: ExportPdfController;
  let service: { generateInvoicePdf: jest.Mock; generatePurchaseOrderPdf: jest.Mock };

  const res = () => {
    const r: any = { setHeader: jest.fn(), send: jest.fn() };
    return r;
  };

  beforeEach(() => {
    service = { generateInvoicePdf: jest.fn(), generatePurchaseOrderPdf: jest.fn() };
    controller = new ExportPdfController(service as any);
  });

  describe('exportInvoice', () => {
    it('sends PDF when generation succeeds', async () => {
      const pdf = Buffer.from('pdf');
      service.generateInvoicePdf.mockResolvedValue(pdf);
      const r = res();

      await controller.exportInvoice({ user: { tenantId: 't1' } } as any, '550e8400-e29b-41d4-a716-446655440000' as any, r);

      expect(service.generateInvoicePdf).toHaveBeenCalledWith('t1', '550e8400-e29b-41d4-a716-446655440000');
      expect(r.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(r.send).toHaveBeenCalledWith(pdf);
    });

    it('throws NotFoundException when invoice is not found', async () => {
      service.generateInvoicePdf.mockRejectedValue(new Error('Invoice not found'));
      const r = res();

      await expect(
        controller.exportInvoice({ user: { tenantId: 't1' } } as any, '550e8400-e29b-41d4-a716-446655440000' as any, r),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rethrows non-not-found errors instead of masking them', async () => {
      const dbError = new Error('database connection lost');
      service.generateInvoicePdf.mockRejectedValue(dbError);
      const r = res();

      await expect(
        controller.exportInvoice({ user: { tenantId: 't1' } } as any, '550e8400-e29b-41d4-a716-446655440000' as any, r),
      ).rejects.toBe(dbError);
    });
  });

  describe('exportPurchaseOrder', () => {
    it('sends PDF when generation succeeds', async () => {
      const pdf = Buffer.from('pdf');
      service.generatePurchaseOrderPdf.mockResolvedValue(pdf);
      const r = res();

      await controller.exportPurchaseOrder({ user: { tenantId: 't1' } } as any, '550e8400-e29b-41d4-a716-446655440000' as any, r);

      expect(service.generatePurchaseOrderPdf).toHaveBeenCalledWith('t1', '550e8400-e29b-41d4-a716-446655440000');
      expect(r.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(r.send).toHaveBeenCalledWith(pdf);
    });

    it('throws NotFoundException when purchase order is not found', async () => {
      service.generatePurchaseOrderPdf.mockRejectedValue(new Error('Purchase order not found'));
      const r = res();

      await expect(
        controller.exportPurchaseOrder({ user: { tenantId: 't1' } } as any, '550e8400-e29b-41d4-a716-446655440000' as any, r),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rethrows non-not-found errors instead of masking them', async () => {
      const dbError = new Error('database connection lost');
      service.generatePurchaseOrderPdf.mockRejectedValue(dbError);
      const r = res();

      await expect(
        controller.exportPurchaseOrder({ user: { tenantId: 't1' } } as any, '550e8400-e29b-41d4-a716-446655440000' as any, r),
      ).rejects.toBe(dbError);
    });
  });
});
