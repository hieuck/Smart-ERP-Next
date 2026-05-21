const mockDb = {
  insert: jest.fn(),
  select: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));
jest.mock('@smart-erp/database/schema', () => ({
  customers: {},
  eInvoices: { createdAt: 'eInvoices.createdAt', customerId: 'eInvoices.customerId', tenantId: 'eInvoices.tenantId' },
  orders: {
    createdAt: 'orders.createdAt',
    customerId: 'orders.customerId',
    id: 'orders.id',
    orderCode: 'orders.orderCode',
    status: 'orders.status',
    tenantId: 'orders.tenantId',
    total: 'orders.total',
  },
  payments: {},
  serviceTickets: {
    createdAt: 'serviceTickets.createdAt',
    customerId: 'serviceTickets.customerId',
    tenantId: 'serviceTickets.tenantId',
  },
}));
jest.mock('@smart-erp/database/drizzle', () => ({
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { NotFoundException } from '@nestjs/common';
import { CustomerPortalService } from './customer-portal.service';

const selectChain = (rows: any[], terminal: 'limit' | 'orderBy' = 'limit') => {
  const chain: any = {
    from: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(rows)),
    orderBy: jest.fn(() => (terminal === 'orderBy' ? Promise.resolve(rows) : chain)),
    where: jest.fn(() => chain),
  };
  return chain;
};
const writeChain = (rows: any[]) => {
  const chain: any = {
    returning: jest.fn(() => Promise.resolve(rows)),
    values: jest.fn(() => chain),
  };
  return chain;
};

describe('CustomerPortalService coverage', () => {
  const service = new CustomerPortalService();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
  });

  afterEach(() => jest.restoreAllMocks());

  it('lists portal orders, tickets, and invoices', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain([{ id: 'order-1' }]))
      .mockReturnValueOnce(selectChain([{ id: 'ticket-1' }]))
      .mockReturnValueOnce(selectChain([{ id: 'invoice-1' }], 'orderBy'));

    await expect(service.getOrders('tenant-1', 'customer-1')).resolves.toEqual([{ id: 'order-1' }]);
    await expect(service.getTickets('tenant-1', 'customer-1')).resolves.toEqual([{ id: 'ticket-1' }]);
    await expect(service.getInvoices('tenant-1', 'customer-1')).resolves.toEqual([{ id: 'invoice-1' }]);
  });

  it('creates tickets and returns order tracking state', async () => {
    const insert = writeChain([{ id: 'ticket-1', ticketNumber: 'TKT-T9BK7K00' }]);
    mockDb.insert.mockReturnValueOnce(insert);
    mockDb.select
      .mockReturnValueOnce(selectChain([{ createdAt: '2026-05-21', orderCode: 'SO-1', status: 'shipping' }]))
      .mockReturnValueOnce(selectChain([]));

    await expect(service.createTicket('tenant-1', 'customer-1', { title: 'Need help' })).resolves.toEqual({
      id: 'ticket-1',
      ticketNumber: 'TKT-T9BK7K00',
    });
    expect(insert.values).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'customer-1', status: 'open', tenantId: 'tenant-1' }),
    );

    await expect(service.getOrderTracking('tenant-1', 'order-1')).resolves.toMatchObject({
      orderCode: 'SO-1',
      status: 'shipping',
      steps: [
        expect.objectContaining({ completed: true }),
        expect.objectContaining({ completed: true }),
        expect.objectContaining({ completed: true }),
        expect.objectContaining({ completed: false }),
      ],
    });
    await expect(service.getOrderTracking('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
