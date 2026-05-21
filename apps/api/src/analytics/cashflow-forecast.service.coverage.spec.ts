const mockDb = { execute: jest.fn() };

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  orders: {},
  payments: {},
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { CashflowForecastService } from './cashflow-forecast.service';

describe('CashflowForecastService coverage', () => {
  let service: CashflowForecastService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    service = new CashflowForecastService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds daily net cashflow from revenue and expense rows', async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);
    const firstDate = startDate.toISOString().slice(0, 10);
    const nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const secondDate = nextDate.toISOString().slice(0, 10);

    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ date: firstDate, revenue: '1000' }] })
      .mockResolvedValueOnce({ rows: [{ date: firstDate, expense: '250' }] });

    await expect(service.getHistoricalDailyNet('tenant-1', 1)).resolves.toEqual([
      { date: firstDate, net: 750 },
      { date: secondDate, net: 0 },
    ]);
  });

  it('forecasts future dates with non-negative smoothing values', async () => {
    jest.spyOn(service, 'getHistoricalDailyNet').mockResolvedValueOnce([
      { date: '2026-05-20', net: -100 },
      { date: '2026-05-21', net: 500 },
    ]);

    await expect(service.forecast('tenant-1', 3)).resolves.toEqual({
      dates: ['2026-05-22', '2026-05-23', '2026-05-24'],
      values: [500, 500, 500],
      historical: [
        { date: '2026-05-20', net: -100 },
        { date: '2026-05-21', net: 500 },
      ],
    });

    jest.spyOn(service, 'getHistoricalDailyNet').mockResolvedValueOnce([]);
    await expect(service.forecast('tenant-1', 2)).resolves.toEqual({
      dates: ['2026-05-22', '2026-05-23'],
      values: [0, 0],
      historical: [],
    });
  });

  it('uses default historical and forecast windows', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(service.getHistoricalDailyNet('tenant-1')).resolves.toHaveLength(91);

    jest.spyOn(service, 'getHistoricalDailyNet').mockResolvedValueOnce([{ date: '2026-05-21', net: 100 }]);
    const forecast = await service.forecast('tenant-1');
    expect(forecast.dates).toHaveLength(30);
    expect(forecast.values).toHaveLength(30);
  });
});
