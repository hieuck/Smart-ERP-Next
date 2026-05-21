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
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
}));

import { ChurnPredictionService } from './churn.service';

const selectQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

describe('ChurnPredictionService coverage', () => {
  let service: ChurnPredictionService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.execute.mockResolvedValue({ rows: [] });
    service = new ChurnPredictionService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('skips storage when no customer metrics exist and stores high/medium/low risks', async () => {
    selectQueue.push([]);
    await expect(service.computeAndStore('tenant-1')).resolves.toBeUndefined();
    expect(mockDb.execute).not.toHaveBeenCalled();

    selectQueue.push([{ id: 'high' }, { id: 'medium' }, { id: 'low' }]);
    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ total_spent: '100000', order_count: 1, last_order_date: '2026-01-01' }] })
      .mockResolvedValueOnce({ rows: [{ total_spent: '1500000', order_count: 3, last_order_date: '2026-04-01' }] })
      .mockResolvedValueOnce({ rows: [{ total_spent: '5000000', order_count: 8, last_order_date: '2026-05-15' }] })
      .mockResolvedValue({ rows: [] });

    await expect(service.computeAndStore('tenant-1')).resolves.toBeUndefined();
    const executedValues = mockDb.execute.mock.calls.map((call) => JSON.stringify(call[0]));
    expect(executedValues.some((query) => query.includes('high'))).toBe(true);
    expect(executedValues.some((query) => query.includes('medium'))).toBe(true);
    expect(executedValues.some((query) => query.includes('low'))).toBe(true);

    selectQueue.push([{ id: 'high-low-frequency' }, { id: 'medium-low-frequency' }, { id: 'no-orders' }]);
    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ total_spent: '100000', order_count: 1, last_order_date: '2026-04-15' }] })
      .mockResolvedValueOnce({ rows: [{ total_spent: '1000000', order_count: 3, last_order_date: '2026-05-10' }] })
      .mockResolvedValueOnce({ rows: [{ total_spent: '0', order_count: 0, last_order_date: null }] })
      .mockResolvedValue({ rows: [] });

    await expect(service.computeAndStore('tenant-1')).resolves.toBeUndefined();
  });

  it('loads latest predictions and segment summaries', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ run_date: '2026-05-21' }] })
      .mockResolvedValueOnce({ rows: [{ customer_id: 'c1', risk_segment: 'high' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ run_date: '2026-05-21' }] })
      .mockResolvedValueOnce({ rows: [{ risk_segment: 'high', count: 2, avg_probability: '85' }] });

    await expect(service.getLatestPredictions('tenant-1')).resolves.toEqual([]);
    await expect(service.getLatestPredictions('tenant-1', 'high')).resolves.toEqual([
      { customer_id: 'c1', risk_segment: 'high' },
    ]);
    await expect(service.getSegmentSummary('tenant-1')).resolves.toBeNull();
    await expect(service.getSegmentSummary('tenant-1')).resolves.toEqual([
      { risk_segment: 'high', count: 2, avg_probability: '85' },
    ]);
  });
});
