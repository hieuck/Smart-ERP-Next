jest.mock('@smart-erp/database', () => ({
  eInvoices: {
    id: 'eInvoices.id',
    tenantId: 'eInvoices.tenantId',
  },
  eInvoiceItems: {
    invoiceId: 'eInvoiceItems.invoiceId',
    sequenceOrder: 'eInvoiceItems.sequenceOrder',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EInvoiceService, CreateEInvoiceDto } from './e-invoice.service';

const selectQueue: any[][] = [];
const insertQueue: any[][] = [];
const updateQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeWriteChain = (queue: any[][] = []) => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(queue.shift() ?? [])),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(undefined).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('EInvoiceService coverage', () => {
  const db = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    execute: jest.fn(),
  };
  let service: EInvoiceService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T03:00:00.000Z'));
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
    selectQueue.length = 0;
    insertQueue.length = 0;
    updateQueue.length = 0;
    db.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    db.insert.mockImplementation(() => makeWriteChain(insertQueue));
    db.update.mockImplementation(() => makeWriteChain(updateQueue));
    db.execute.mockResolvedValue([]);
    service = new EInvoiceService({ db } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const invoiceDto: CreateEInvoiceDto = {
    orderId: 'order-1',
    customerId: 'customer-1',
    buyerName: 'Cong ty ABC',
    buyerTaxCode: '0312345678',
    buyerAddress: 'TP HCM',
    buyerEmail: 'billing@example.com',
    buyerPhone: '0900000000',
    invoiceSeries: 'C26TAA',
    vatRate: 10,
    notes: 'Ban le',
    lineItems: [
      { itemName: 'Ao thun', unit: 'cai', quantity: 2, unitPrice: 100000, discountRate: 10 },
      { itemName: 'Phi van chuyen', quantity: 1, unitPrice: 20000, vatRate: 8 },
    ],
  };

  it('creates draft invoices with calculated totals and optional normalized items', async () => {
    insertQueue.push([{ id: 'invoice-1', totalAmount: '219600', status: 'draft' }]);

    await expect(service.create('tenant-1', 'user-1', invoiceDto)).resolves.toEqual({
      id: 'invoice-1',
      totalAmount: '219600',
      status: 'draft',
    });
    expect(db.insert).toHaveBeenCalledTimes(2);

    insertQueue.push([{ id: 'invoice-2', totalAmount: '0', status: 'draft' }]);
    await expect(service.create('tenant-1', 'user-1', {
      buyerName: 'Khach le',
      invoiceSeries: 'C26TAA',
      lineItems: [],
    })).resolves.toEqual({ id: 'invoice-2', totalAmount: '0', status: 'draft' });
  });

  it('issues draft or signed invoices and rejects invalid issue states', async () => {
    selectQueue.push([]);
    await expect(service.issue('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);

    selectQueue.push([{ id: 'invoice-1', status: 'cancelled' }]);
    await expect(service.issue('tenant-1', 'invoice-1')).rejects.toBeInstanceOf(BadRequestException);

    selectQueue.push([{ id: 'invoice-1', status: 'draft', provider: 'vnpt' }]);
    db.execute.mockResolvedValueOnce([{ next_num: 12 }]);
    updateQueue.push([{ id: 'invoice-1', status: 'issued', invoiceNumber: '0000012' }]);

    await expect(service.issue('tenant-1', 'invoice-1')).resolves.toEqual({
      id: 'invoice-1',
      status: 'issued',
      invoiceNumber: '0000012',
    });

    selectQueue.push([{ id: 'invoice-2', status: 'signed', provider: 'viettel' }]);
    db.execute.mockResolvedValueOnce([]);
    updateQueue.push([{ id: 'invoice-2', status: 'issued', invoiceNumber: '0000001' }]);
    await expect(service.issue('tenant-1', 'invoice-2')).resolves.toMatchObject({ invoiceNumber: '0000001' });
  });

  it('cancels invoices with status and reason validation', async () => {
    selectQueue.push([]);
    await expect(service.cancel('tenant-1', 'missing', 'Sai thong tin')).rejects.toBeInstanceOf(NotFoundException);

    selectQueue.push([{ id: 'invoice-1', status: 'draft' }]);
    await expect(service.cancel('tenant-1', 'invoice-1', 'Sai thong tin')).rejects.toBeInstanceOf(BadRequestException);

    selectQueue.push([{ id: 'invoice-1', status: 'issued' }]);
    await expect(service.cancel('tenant-1', 'invoice-1', '  ')).rejects.toBeInstanceOf(BadRequestException);

    selectQueue.push([{ id: 'invoice-1', status: 'issued' }]);
    updateQueue.push([{ id: 'invoice-1', status: 'cancelled', cancellationReason: 'Sai ma so thue' }]);
    await expect(service.cancel('tenant-1', 'invoice-1', 'Sai ma so thue')).resolves.toEqual({
      id: 'invoice-1',
      status: 'cancelled',
      cancellationReason: 'Sai ma so thue',
    });
  });

  it('replaces eligible invoices and lists/details/stats invoices', async () => {
    selectQueue.push([]);
    await expect(service.replace('tenant-1', 'missing', 'user-1', invoiceDto)).rejects.toBeInstanceOf(NotFoundException);

    selectQueue.push([{ id: 'invoice-1', status: 'draft' }]);
    await expect(service.replace('tenant-1', 'invoice-1', 'user-1', invoiceDto)).rejects.toBeInstanceOf(BadRequestException);

    selectQueue.push([{ id: 'invoice-1', status: 'issued' }]);
    jest.spyOn(service, 'create').mockResolvedValueOnce({ id: 'replacement-1', status: 'draft' } as any);
    await expect(service.replace('tenant-1', 'invoice-1', 'user-1', invoiceDto)).resolves.toEqual({
      id: 'replacement-1',
      status: 'draft',
    });
    expect(db.update).toHaveBeenCalled();

    db.execute.mockResolvedValueOnce([{ id: 'invoice-row' }]);
    await expect(service.list('tenant-1', { status: 'issued', page: 2, limit: 5, search: 'ABC' })).resolves.toEqual({
      items: [{ id: 'invoice-row' }],
      page: 2,
      limit: 5,
    });
    db.execute.mockResolvedValueOnce([]);
    await expect(service.list('tenant-1')).resolves.toEqual({
      items: [],
      page: 1,
      limit: 20,
    });

    selectQueue.push([], [{ id: 'invoice-1', buyerName: 'ABC' }], [{ id: 'item-1', sequenceOrder: 1 }]);
    await expect(service.findById('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findById('tenant-1', 'invoice-1')).resolves.toEqual({
      id: 'invoice-1',
      buyerName: 'ABC',
      items: [{ id: 'item-1', sequenceOrder: 1 }],
    });

    db.execute.mockResolvedValueOnce([{ issued_count: 2, draft_count: 1, total_revenue: '100000' }]);
    await expect(service.getStats('tenant-1', 2026, 5)).resolves.toEqual({
      issued_count: 2,
      draft_count: 1,
      total_revenue: '100000',
    });
    db.execute.mockResolvedValueOnce([]);
    await expect(service.getStats('tenant-1', 2026, 12)).resolves.toEqual({});
  });
});
