import { CurrenciesController } from '../currencies/currencies.controller';
import { CustomersController } from '../customers/customers.controller';
import { OrdersController } from '../orders/orders.controller';
import { ProductsController } from '../products/products.controller';
import { ImportController } from '../import/import.controller';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

describe('controller delegation', () => {
  const req = { user: { tenantId: 'tenant-1', sub: 'user-1' } };

  describe('ProductsController', () => {
    const service = {
      adjustStock: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      findAllForExport: jest.fn(),
      findBySku: jest.fn(),
      findCategories: jest.fn(),
      findOne: jest.fn(),
      getTransactions: jest.fn(),
      importFromCsv: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };
    const controller = new ProductsController(service as any);

    beforeEach(() => jest.clearAllMocks());
    afterEach(() => {
      const uploadDir = join(process.cwd(), 'uploads', 'products', 'tenant-1');
      if (existsSync(uploadDir)) rmSync(uploadDir, { recursive: true, force: true });
    });

    it('passes tenant and user context into product service calls', async () => {
      const product = { name: 'Coffee', sku: 'CF-1' };
      const query = { page: 2, limit: 10 };
      const update = { name: 'Tea' };
      const stock = { quantity: 5, type: 'IN' as const, notes: 'restock', reference: 'po-1' };
      service.findAllForExport.mockResolvedValueOnce([product]);

      controller.create(req, product as any);
      controller.findAll(req, query as any);
      controller.findBySku(req, 'CF-1');
      await expect(controller.exportProducts(req, query as any)).resolves.toEqual({ items: [product] });
      controller.findCategories(req);
      controller.findOne(req, 'product-1', 'vi');
      controller.update(req, 'product-1', update as any);
      controller.remove(req, 'product-1');
      controller.adjustStock(req, 'product-1', stock);
      controller.importProducts(req, { buffer: Buffer.from('sku,name\nCF-1,Coffee') });
      controller.getTransactions(req, 'product-1');

      expect(service.create).toHaveBeenCalledWith('tenant-1', product, 'user-1');
      expect(service.findAll).toHaveBeenCalledWith('tenant-1', query);
      expect(service.findBySku).toHaveBeenCalledWith('tenant-1', 'CF-1');
      expect(service.findAllForExport).toHaveBeenCalledWith('tenant-1', query);
      expect(service.findCategories).toHaveBeenCalledWith('tenant-1');
      expect(service.findOne).toHaveBeenCalledWith('tenant-1', 'product-1', 'vi');
      expect(service.update).toHaveBeenCalledWith('tenant-1', 'product-1', update, 'user-1');
      expect(service.remove).toHaveBeenCalledWith('tenant-1', 'product-1', 'user-1');
      expect(service.adjustStock).toHaveBeenCalledWith(
        'tenant-1',
        'product-1',
        5,
        'IN',
        'restock',
        'po-1',
        'user-1',
      );
      expect(service.importFromCsv).toHaveBeenCalledWith(
        'tenant-1',
        Buffer.from('sku,name\nCF-1,Coffee'),
      );
      expect(service.getTransactions).toHaveBeenCalledWith('tenant-1', 'product-1');
    });

    it('stores uploaded product images and rejects unsupported files', () => {
      const uploaded = controller.uploadImage(req, {
        buffer: Buffer.from('image-bytes'),
        mimetype: 'image/png',
        size: 11,
      } as any);

      expect(uploaded).toMatchObject({
        imageUrl: expect.stringMatching(/^\/uploads\/products\/tenant-1\/.+\.png$/),
        mimeType: 'image/png',
        size: 11,
      });
      expect(existsSync(join(process.cwd(), uploaded.imageUrl))).toBe(true);
      expect(() =>
        controller.uploadImage(req, {
          buffer: Buffer.from('not-image'),
          mimetype: 'text/plain',
          size: 9,
        } as any),
      ).toThrow('Only JPG, PNG, WEBP, and GIF images are allowed');
    });
  });

  describe('CustomersController', () => {
    const service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };
    const controller = new CustomersController(service as any);

    beforeEach(() => jest.clearAllMocks());

    it('normalizes customer query params before delegating', () => {
      controller.create(req, { name: 'Retail buyer' } as any);
      controller.findAll(req, '3', '50', 'retail', 'vip', 'false');
      controller.findAll(req);
      controller.findOne(req, 'customer-1');
      controller.update(req, 'customer-1', { name: 'Updated' } as any);
      controller.remove(req, 'customer-1');

      expect(service.create).toHaveBeenCalledWith('tenant-1', 'user-1', { name: 'Retail buyer' });
      expect(service.findAll).toHaveBeenNthCalledWith(1, 'tenant-1', {
        group: 'vip',
        isActive: false,
        limit: 50,
        page: 3,
        search: 'retail',
      });
      expect(service.findAll).toHaveBeenNthCalledWith(2, 'tenant-1', {
        group: undefined,
        isActive: undefined,
        limit: undefined,
        page: undefined,
        search: undefined,
      });
      expect(service.findOne).toHaveBeenCalledWith('tenant-1', 'customer-1');
      expect(service.update).toHaveBeenCalledWith('tenant-1', 'user-1', 'customer-1', {
        name: 'Updated',
      });
      expect(service.remove).toHaveBeenCalledWith('tenant-1', 'user-1', 'customer-1');
    });
  });

  describe('OrdersController', () => {
    const service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      generateEInvoiceXml: jest.fn(),
      updateStatus: jest.fn(),
    };
    const controller = new OrdersController(service as any);

    beforeEach(() => jest.clearAllMocks());

    it('maps order requests to service calls and streams e-invoice xml', async () => {
      const res = { send: jest.fn(), setHeader: jest.fn() };
      service.generateEInvoiceXml.mockResolvedValueOnce('<invoice />');

      controller.create(req, { customerId: 'customer-1' } as any);
      controller.findAll(req, { page: 2, limit: 25, search: 'SO-1', status: 'confirmed', paymentStatus: 'paid', channel: 'web' } as any);
      controller.findAll(req, {} as any);
      controller.findOne(req, 'order-1');
      await controller.generateEInvoice(req, 'order-1', res as any);
      controller.updateStatus(req, 'order-1', { cancelReason: 'duplicate', status: 'cancelled' });

      expect(service.create).toHaveBeenCalledWith('tenant-1', 'user-1', { customerId: 'customer-1' });
      expect(service.findAll).toHaveBeenNthCalledWith(1, 'tenant-1', {
        channel: 'web',
        limit: 25,
        page: 2,
        paymentStatus: 'paid',
        search: 'SO-1',
        status: 'confirmed',
      });
      expect(service.findAll).toHaveBeenNthCalledWith(2, 'tenant-1', {
        channel: undefined,
        limit: undefined,
        page: undefined,
        paymentStatus: undefined,
        search: undefined,
        status: undefined,
      });
      expect(service.findOne).toHaveBeenCalledWith('tenant-1', 'order-1');
      expect(service.generateEInvoiceXml).toHaveBeenCalledWith('tenant-1', 'order-1');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/xml');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=invoice-order-1.xml',
      );
      expect(res.send).toHaveBeenCalledWith('<invoice />');
      expect(service.updateStatus).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'order-1',
        'cancelled',
        'duplicate',
      );
    });
  });

  describe('CurrenciesController', () => {
    const service = {
      convertAmount: jest.fn(),
      create: jest.fn(),
      createExchangeRate: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getBaseCurrency: jest.fn(),
      getExchangeRate: jest.fn(),
      getExchangeRates: jest.fn(),
      remove: jest.fn(),
      removeExchangeRate: jest.fn(),
      update: jest.fn(),
      updateExchangeRate: jest.fn(),
    };
    const controller = new CurrenciesController(service as any);

    beforeEach(() => jest.clearAllMocks());

    it('delegates currency and exchange-rate endpoints with parsed amounts', () => {
      const currency = { code: 'USD' };
      const rate = { fromCurrency: 'USD', rate: 24500, toCurrency: 'VND' };

      controller.create(req, currency as any);
      controller.findAll(req);
      controller.findOne(req, 'currency-1');
      controller.getBase(req);
      controller.update(req, 'currency-1', { isActive: false } as any);
      controller.remove(req, 'currency-1');
      controller.convert(req, 'USD', 'VND', '12.5' as any, '2026-05-20');
      controller.convert(req, 'USD', 'VND', 'bad-amount' as any);
      controller.createExchangeRate(req, rate as any);
      controller.getExchangeRates(req, 'USD');
      controller.getExchangeRate(req, 'USD', 'VND', '2026-05-20');
      controller.updateExchangeRate(req, 'rate-1', { rate: 24600 } as any);
      controller.removeExchangeRate(req, 'rate-1');

      expect(service.create).toHaveBeenCalledWith('tenant-1', currency);
      expect(service.findAll).toHaveBeenCalledWith('tenant-1');
      expect(service.findOne).toHaveBeenCalledWith('tenant-1', 'currency-1');
      expect(service.getBaseCurrency).toHaveBeenCalledWith('tenant-1');
      expect(service.update).toHaveBeenCalledWith('tenant-1', 'currency-1', { isActive: false });
      expect(service.remove).toHaveBeenCalledWith('tenant-1', 'currency-1');
      expect(service.convertAmount).toHaveBeenNthCalledWith(
        1,
        'tenant-1',
        12.5,
        'USD',
        'VND',
        '2026-05-20',
      );
      expect(service.convertAmount).toHaveBeenNthCalledWith(
        2,
        'tenant-1',
        0,
        'USD',
        'VND',
        undefined,
      );
      expect(service.createExchangeRate).toHaveBeenCalledWith('tenant-1', rate);
      expect(service.getExchangeRates).toHaveBeenCalledWith('tenant-1', 'USD');
      expect(service.getExchangeRate).toHaveBeenCalledWith('tenant-1', 'USD', 'VND', '2026-05-20');
      expect(service.updateExchangeRate).toHaveBeenCalledWith('tenant-1', 'rate-1', { rate: 24600 });
      expect(service.removeExchangeRate).toHaveBeenCalledWith('tenant-1', 'rate-1');
    });
  });

  describe('ImportController', () => {
    const service = {
      previewProducts: jest.fn(),
      confirmImport: jest.fn(),
      getPreview: jest.fn(),
    };
    const controller = new ImportController(service as any);
    const req = { user: { tenantId: 'tenant-1', sub: 'user-1' } };

    beforeEach(() => jest.clearAllMocks());

    it('preview delegates to service with tenant and file buffer', async () => {
      const file = { buffer: Buffer.from('fake-xlsx'), originalname: 'test.xlsx' } as Express.Multer.File;
      service.previewProducts.mockResolvedValue({ batchId: 'b-1' });

      const result = await controller.previewProducts(req, file);

      expect(service.previewProducts).toHaveBeenCalledWith('tenant-1', file.buffer, 'test.xlsx');
      expect(result).toEqual({ batchId: 'b-1' });
    });

    it('preview throws when file missing', async () => {
      await expect(controller.previewProducts(req, undefined as any))
        .rejects.toThrow('File is required');
    });

    it('confirm delegates to service with tenant and batchId', async () => {
      service.confirmImport.mockResolvedValue({ imported: 5, errors: 1 });

      const result = await controller.confirmImport(req, { batchId: 'b-1' });

      expect(service.confirmImport).toHaveBeenCalledWith('tenant-1', 'b-1');
      expect(result).toEqual({ imported: 5, errors: 1 });
    });

    it('confirm throws when batchId missing', async () => {
      await expect(controller.confirmImport(req, { batchId: '' }))
        .rejects.toThrow('batchId is required');
    });

    it('getPreview returns preview for existing batch', () => {
      service.getPreview.mockReturnValue({ batchId: 'b-1' });

      const result = controller.getPreview('b-1');

      expect(service.getPreview).toHaveBeenCalledWith('b-1');
      expect(result).toEqual({ batchId: 'b-1' });
    });

    it('getPreview throws when batch not found', () => {
      service.getPreview.mockReturnValue(undefined);

      expect(() => controller.getPreview('missing'))
        .toThrow('Batch not found or expired');
    });
  });
});
