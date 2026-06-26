jest.mock('@smart-erp/database', () => ({
  eInvoices: {
    id: 'eInvoices.id',
    tenantId: 'eInvoices.tenantId',
    status: 'eInvoices.status',
    createdBy: 'eInvoices.createdBy',
    provider: 'eInvoices.provider',
    invoiceNumber: 'eInvoices.invoiceNumber',
    createdAt: 'eInvoices.createdAt',
    updatedAt: 'eInvoices.updatedAt',
    totalAmount: 'eInvoices.totalAmount',
    vatAmount: 'eInvoices.vatAmount',
    subtotal: 'eInvoices.subtotal',
    vatRate: 'eInvoices.vatRate',
    currency: 'eInvoices.currency',
    buyerName: 'eInvoices.buyerName',
    buyerTaxCode: 'eInvoices.buyerTaxCode',
    buyerAddress: 'eInvoices.buyerAddress',
    buyerEmail: 'eInvoices.buyerEmail',
    buyerPhone: 'eInvoices.buyerPhone',
    orderId: 'eInvoices.orderId',
    customerId: 'eInvoices.customerId',
    invoiceSeries: 'eInvoices.invoiceSeries',
    invoiceTemplate: 'eInvoices.invoiceTemplate',
    notes: 'eInvoices.notes',
    lineItems: 'eInvoices.lineItems',
    id: 'eInvoices.id',
    cancellationReason: 'eInvoices.cancellationReason',
  },
  eInvoiceItems: {
    invoiceId: 'eInvoiceItems.invoiceId',
    sequenceOrder: 'eInvoiceItems.sequenceOrder',
    tenantId: 'eInvoiceItems.tenantId',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EInvoiceService } from '../e-invoice/e-invoice.service';

const selectQueue: any[][] = [];
const insertQueue: any[][] = [];
const updateQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: jest.fn((onFulfilled: any, onRejected: any) =>
      Promise.resolve(rows).then(onFulfilled, onRejected),
    ),
  };
  return chain;
};

const makeWriteChain = (queue: any[][] = []) => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(queue.shift() ?? [])),
    then: jest.fn((onFulfilled: any, onRejected: any) =>
      Promise.resolve(undefined).then(onFulfilled, onRejected),
    ),
  };
  return chain;
};

describe('EInvoiceService (integration)', () => {
  const mockDb = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    execute: jest.fn(),
  };
  let service: EInvoiceService;
  const TENANT_ID = 'tenant-1';
  const USER_ID = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T03:00:00.000Z'));
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
    selectQueue.length = 0;
    insertQueue.length = 0;
    updateQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain(insertQueue));
    mockDb.update.mockImplementation(() => makeWriteChain(updateQueue));
    mockDb.execute.mockResolvedValue([]);
    service = new (EInvoiceService as any)({ db: mockDb });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('create', () => {
    const baseDto: any = {
      buyerName: 'Cong ty ABC',
      buyerTaxCode: '0312345678',
      buyerAddress: 'TP HCM',
      buyerEmail: 'billing@example.com',
      buyerPhone: '0900000000',
      invoiceSeries: 'C26TAA',
      vatRate: 10,
      currency: 'VND',
      provider: 'vnpt',
      notes: 'Ban le',
      lineItems: [
        { itemName: 'Ao thun', unit: 'cai', quantity: 2, unitPrice: 100000, discountRate: 10 },
        { itemName: 'Phi van chuyen', quantity: 1, unitPrice: 20000, vatRate: 8 },
      ],
    };

    it('creates a draft e-invoice with calculated totals', async () => {
      insertQueue.push([{ id: 'inv-1', totalAmount: '219600', status: 'draft' }]);

      const result = await service.create(TENANT_ID, USER_ID, baseDto);

      expect(result).toEqual({ id: 'inv-1', totalAmount: '219600', status: 'draft' });
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it('creates an e-invoice with empty line items', async () => {
      insertQueue.push([{ id: 'inv-2', totalAmount: '0', status: 'draft' }]);

      const result = await service.create(TENANT_ID, USER_ID, {
        buyerName: 'Khach le',
        invoiceSeries: 'C26TAA',
        lineItems: [],
      } as any);

      expect(result.status).toBe('draft');
      expect(result.totalAmount).toBe('0');
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('uses default vatRate when not provided', async () => {
      insertQueue.push([{ id: 'inv-3', status: 'draft' }]);

      const result = await service.create(TENANT_ID, USER_ID, {
        buyerName: 'Test',
        invoiceSeries: 'C26TAA',
        lineItems: [{ itemName: 'Item', quantity: 1, unitPrice: 100 }],
      } as any);

      expect(result).toBeDefined();
    });
  });

  describe('issue', () => {
    it('throws NotFoundException when invoice does not exist', async () => {
      selectQueue.push([]);

      await expect(service.issue(TENANT_ID, 'missing'))
        .rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for non-draft/signed status', async () => {
      selectQueue.push([{ id: 'inv-1', status: 'cancelled' }]);

      await expect(service.issue(TENANT_ID, 'inv-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('issues a draft invoice successfully', async () => {
      selectQueue.push([{ id: 'inv-1', status: 'draft', provider: 'vnpt' }]);
      mockDb.execute.mockResolvedValueOnce([{ next_num: 12 }]);
      updateQueue.push([{ id: 'inv-1', status: 'issued', invoiceNumber: '0000012' }]);

      const result = await service.issue(TENANT_ID, 'inv-1');

      expect(result.status).toBe('issued');
      expect(result.invoiceNumber).toBe('0000012');
    });

    it('issues a signed invoice and generates invoice number 1 when no prior invoices', async () => {
      selectQueue.push([{ id: 'inv-2', status: 'signed', provider: 'viettel' }]);
      mockDb.execute.mockResolvedValueOnce([]);
      updateQueue.push([{ id: 'inv-2', status: 'issued', invoiceNumber: '0000001' }]);

      const result = await service.issue(TENANT_ID, 'inv-2');

      expect(result.invoiceNumber).toBe('0000001');
    });
  });

  describe('cancel', () => {
    it('throws NotFoundException when invoice does not exist', async () => {
      selectQueue.push([]);

      await expect(service.cancel(TENANT_ID, 'missing', 'reason'))
        .rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when invoice is not issued', async () => {
      selectQueue.push([{ id: 'inv-1', status: 'draft' }]);

      await expect(service.cancel(TENANT_ID, 'inv-1', 'reason'))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when reason is empty/whitespace', async () => {
      selectQueue.push([{ id: 'inv-1', status: 'issued' }]);

      await expect(service.cancel(TENANT_ID, 'inv-1', '   '))
        .rejects.toThrow(BadRequestException);
    });

    it('cancels an issued invoice successfully', async () => {
      selectQueue.push([{ id: 'inv-1', status: 'issued' }]);
      updateQueue.push([{ id: 'inv-1', status: 'cancelled', cancellationReason: 'Sai thong tin' }]);

      const result = await service.cancel(TENANT_ID, 'inv-1', 'Sai thong tin');

      expect(result.status).toBe('cancelled');
      expect(result.cancellationReason).toBe('Sai thong tin');
    });
  });

  describe('replace', () => {
    it('throws NotFoundException when original invoice does not exist', async () => {
      selectQueue.push([]);

      await expect(service.replace(TENANT_ID, 'missing', USER_ID, {} as any))
        .rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when original invoice is not issued/adjusted', async () => {
      selectQueue.push([{ id: 'inv-1', status: 'draft' }]);

      await expect(service.replace(TENANT_ID, 'inv-1', USER_ID, {} as any))
        .rejects.toThrow(BadRequestException);
    });

    it('replaces an issued invoice and creates a new replacement', async () => {
      selectQueue.push([{ id: 'inv-1', status: 'issued' }]);
      insertQueue.push([{ id: 'replacement-1', status: 'draft' }]);

      const result = await service.replace(TENANT_ID, 'inv-1', USER_ID, {
        buyerName: 'New Buyer',
        invoiceSeries: 'C26TAA',
        lineItems: [],
      } as any);

      expect(result).toBeDefined();
      expect(result.id).toBe('replacement-1');
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });

    it('replaces an adjusted invoice', async () => {
      selectQueue.push([{ id: 'inv-1', status: 'adjusted' }]);
      insertQueue.push([{ id: 'replacement-2', status: 'draft' }]);

      const result = await service.replace(TENANT_ID, 'inv-1', USER_ID, {
        buyerName: 'Adjusted',
        invoiceSeries: 'C26TAA',
        lineItems: [{ itemName: 'Goods', quantity: 1, unitPrice: 50000 }],
      } as any);

      expect(result.id).toBe('replacement-2');
    });
  });

  describe('list', () => {
    it('returns paginated list with default values', async () => {
      mockDb.execute.mockResolvedValueOnce([{ id: 'inv-1' }, { id: 'inv-2' }]);

      const result = await service.list(TENANT_ID, {});

      expect(result.items).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('applies status and pagination filters', async () => {
      mockDb.execute.mockResolvedValueOnce([{ id: 'inv-1' }]);

      const result = await service.list(TENANT_ID, { status: 'issued', page: 2, limit: 5 });

      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
    });

    it('returns empty list when no invoices match', async () => {
      mockDb.execute.mockResolvedValueOnce([]);

      const result = await service.list(TENANT_ID, { status: 'cancelled' });

      expect(result.items).toEqual([]);
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when invoice does not exist', async () => {
      selectQueue.push([]);

      await expect(service.findById(TENANT_ID, 'missing'))
        .rejects.toThrow(NotFoundException);
    });

    it('returns invoice with line items', async () => {
      selectQueue.push(
        [{ id: 'inv-1', buyerName: 'ABC', tenantId: TENANT_ID }],
        [{ id: 'item-1', sequenceOrder: 1 }],
      );

      const result = await service.findById(TENANT_ID, 'inv-1');

      expect(result.id).toBe('inv-1');
      expect(result.items).toEqual([{ id: 'item-1', sequenceOrder: 1 }]);
    });
  });

  describe('getStats', () => {
    it('returns monthly stats for a given year/month', async () => {
      mockDb.execute.mockResolvedValueOnce([{
        issued_count: 5,
        draft_count: 2,
        cancelled_count: 1,
        total_revenue: '50000000',
        total_vat: '5000000',
      }]);

      const result = await service.getStats(TENANT_ID, 2026, 5);

      expect(result.issued_count).toBe(5);
      expect(result.draft_count).toBe(2);
      expect(result.total_revenue).toBe('50000000');
    });

    it('returns empty object when no data', async () => {
      mockDb.execute.mockResolvedValueOnce([]);

      const result = await service.getStats(TENANT_ID, 2026, 6);

      expect(result).toEqual({});
    });
  });
});
