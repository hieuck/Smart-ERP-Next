const mockDb = {
  select: jest.fn(),
  execute: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  customers: {
    id: 'customers.id',
    tenantId: 'customers.tenantId',
  },
  orders: {},
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
}));

import { ClvService } from './clv.service';

const selectQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('ClvService coverage', () => {
  let service: ClvService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.execute.mockResolvedValue({ rows: [] });
    service = new ClvService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not store CLV when the tenant has no customers', async () => {
    selectQueue.push([]);

    await expect(service.computeAndStore('tenant-1')).resolves.toBeUndefined();
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it('computes and stores CLV segments with recency and confidence', async () => {
    selectQueue.push([
      { id: 'vip' },
      { id: 'high' },
      { id: 'medium' },
      { id: 'risk' },
      { id: 'low' },
    ]);
    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ total_spent: '24000000', order_count: 12, last_order_date: '2026-05-20' }] })
      .mockResolvedValueOnce({ rows: [{ total_spent: '4800000', order_count: 12, last_order_date: '2026-05-20' }] })
      .mockResolvedValueOnce({ rows: [{ total_spent: '1800000', order_count: 6, last_order_date: '2026-05-10' }] })
      .mockResolvedValueOnce({ rows: [{ total_spent: '0', order_count: 0, last_order_date: '1970-01-01' }] })
      .mockResolvedValueOnce({ rows: [{ total_spent: '300000', order_count: 1, last_order_date: '2026-05-01' }] })
      .mockResolvedValue({ rows: [] });

    await expect(service.computeAndStore('tenant-1')).resolves.toBeUndefined();

    const executedValues = mockDb.execute.mock.calls.map((call) => JSON.stringify(call[0]));
    expect(executedValues.some((query) => query.includes('vip'))).toBe(true);
    expect(executedValues.some((query) => query.includes('high'))).toBe(true);
    expect(executedValues.some((query) => query.includes('medium'))).toBe(true);
    expect(executedValues.some((query) => query.includes('at_risk'))).toBe(true);
    expect(executedValues.some((query) => query.includes('low'))).toBe(true);
  });

  it('loads latest predictions with optional segment filters', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ run_date: '2026-05-21' }] })
      .mockResolvedValueOnce({ rows: [{ customer_id: 'c1', segment: 'vip' }] });

    await expect(service.getLatestPredictions('tenant-1')).resolves.toEqual([]);
    await expect(service.getLatestPredictions('tenant-1', 'vip')).resolves.toEqual([
      { customer_id: 'c1', segment: 'vip' },
    ]);
  });

  it('returns segmentation summary for the latest run or null when unavailable', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ run_date: '2026-05-21' }] })
      .mockResolvedValueOnce({ rows: [{ segment: 'vip', count: 2, total_clv: '30000000', avg_clv: '15000000' }] });

    await expect(service.getSegmentationSummary('tenant-1')).resolves.toBeNull();
    await expect(service.getSegmentationSummary('tenant-1')).resolves.toEqual([
      { segment: 'vip', count: 2, total_clv: '30000000', avg_clv: '15000000' },
    ]);
  });
});
