const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  execute: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  payments: {
    id: 'payments.id',
    tenantId: 'payments.tenantId',
    type: 'payments.type',
    method: 'payments.method',
    status: 'payments.status',
    paidAt: 'payments.paidAt',
  },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  ilike: jest.fn((field, value) => ({ op: 'ilike', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  gte: jest.fn((field, value) => ({ op: 'gte', field, value })),
  lte: jest.fn((field, value) => ({ op: 'lte', field, value })),
}));

import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

const selectQueue: any[][] = [];
const returningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    offset: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeWriteChain = () => {
  const chain: any = {
    values: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
  };
  return chain;
};

describe('PaymentsService coverage', () => {
  let service: PaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T03:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.execute.mockResolvedValue({ rows: [] });
    service = new PaymentsService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates receipt and payment records with generated codes', async () => {
    selectQueue.push([{ count: 4 }], [{ count: 1 }]);
    returningQueue.push([{ id: 'pay-1', code: 'PT-000005' }], [{ id: 'pay-2', code: 'PC-000002' }]);

    await expect(service.create('tenant-1', 'user-1', {
      type: 'receipt',
      amount: 100000,
      method: 'cash',
      partyName: 'Khach le',
    } as any)).resolves.toEqual({ id: 'pay-1', code: 'PT-000005' });
    await expect(service.create('tenant-1', 'user-1', {
      type: 'payment',
      amount: 50000,
      method: 'bank_transfer',
      referenceType: 'bill',
      referenceId: 'bill-1',
    } as any)).resolves.toEqual({ id: 'pay-2', code: 'PC-000002' });
  });

  it('lists, loads, and rejects missing payment records', async () => {
    selectQueue.push([{ count: 101 }], [{ id: 'pay-1' }], [], [{ id: 'pay-1', amount: '100000' }]);

    await expect(service.findAll('tenant-1', {
      page: 2,
      limit: 500,
      type: 'receipt',
      method: 'cash',
      from: '2026-05-01',
      to: '2026-05-31',
    })).resolves.toEqual({
      items: [{ id: 'pay-1' }],
      total: 101,
      page: 2,
      limit: 100,
      totalPages: 2,
    });
    await expect(service.findOne('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne('tenant-1', 'pay-1')).resolves.toEqual({ id: 'pay-1', amount: '100000' });

    selectQueue.push([{ count: 0 }], []);
    await expect(service.findAll('tenant-1', {} as any)).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });

  it('summarizes receipts, payments, and balance', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ type: 'receipt', total: '1000000', count: 3 }, { type: 'payment', total: '250000', count: 2 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ type: 'receipt', total: null, count: 1 }, { type: 'payment', total: null, count: 1 }] });

    await expect(service.getSummary('tenant-1', '2026-05-01', '2026-05-31')).resolves.toEqual({
      receipt: 1000000,
      payment: 250000,
      receiptCount: 3,
      paymentCount: 2,
      balance: 750000,
    });
    await expect(service.getSummary('tenant-1')).resolves.toEqual({
      receipt: 0,
      payment: 0,
      receiptCount: 0,
      paymentCount: 0,
      balance: 0,
    });
    await expect(service.getSummary('tenant-1')).resolves.toEqual({
      receipt: 0,
      payment: 0,
      receiptCount: 1,
      paymentCount: 1,
      balance: 0,
    });
  });
});
