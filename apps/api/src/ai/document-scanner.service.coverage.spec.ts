import { Logger } from '@nestjs/common';
import { DocumentScannerService } from './document-scanner.service';

describe('DocumentScannerService coverage', () => {
  const config = { get: jest.fn() };
  let service: DocumentScannerService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    config.get.mockReturnValue('https://ocr.test');
    service = new DocumentScannerService(config as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns OCR service scan responses when the external service succeeds', async () => {
    const fetchMock = jest.spyOn(global as any, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ type: 'invoice', confidence: 0.99, fields: {} }),
    } as any);

    await expect(service.scanDocument('base64', 'invoice')).resolves.toEqual({
      type: 'invoice',
      confidence: 0.99,
      fields: {},
    });
    expect(fetchMock).toHaveBeenCalledWith('https://ocr.test/scan', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ image: 'base64', hint: 'invoice' }),
    }));
  });

  it('falls back to local mock scan results for known and unknown hints in non-production', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'development';
      return undefined;
    });
    jest.spyOn(global as any, 'fetch')
      .mockResolvedValueOnce({ ok: false } as any)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: false } as any)
      .mockResolvedValueOnce({ ok: false } as any)
      .mockResolvedValueOnce({ ok: false } as any);

    await expect(service.scanDocument('base64')).resolves.toMatchObject({ type: 'invoice' });
    await expect(service.scanInvoice('base64')).resolves.toMatchObject({ type: 'invoice' });
    await expect(service.scanReceipt('base64')).resolves.toMatchObject({ type: 'receipt' });
    await expect(service.scanPurchaseOrder('base64')).resolves.toMatchObject({ type: 'purchase_order' });
    await expect(service.scanDocument('base64', 'unknown')).resolves.toMatchObject({
      type: 'unknown',
      fields: { rawText: expect.objectContaining({ value: 'Unable to recognize document' }) },
    });
  });

  it('throws in production when the OCR service is unavailable', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      return 'https://ocr.test';
    });
    jest.spyOn(global as any, 'fetch').mockRejectedValueOnce(new Error('offline'));

    await expect(service.scanDocument('base64', 'invoice')).rejects.toThrow('OCR service unavailable');
  });

  it('throws in production when the OCR service returns a non-ok response', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      return 'https://ocr.test';
    });
    jest.spyOn(global as any, 'fetch').mockResolvedValueOnce({ ok: false, status: 503 } as any);

    await expect(service.scanDocument('base64', 'invoice')).rejects.toThrow('OCR service unavailable');
  });
});
