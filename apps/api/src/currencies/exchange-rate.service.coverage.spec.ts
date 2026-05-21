import { of } from 'rxjs';

jest.mock('@smart-erp/database', () => ({
  currencies: {},
  exchangeRates: {
    baseCurrency: 'exchangeRates.baseCurrency',
    targetCurrency: 'exchangeRates.targetCurrency',
    fetchedAt: 'exchangeRates.fetchedAt',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { ExchangeRateService } from './exchange-rate.service';

const selectQueue: any[][] = [];

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

const makeInsertChain = () => ({
  values: jest.fn().mockResolvedValue(undefined),
});

describe('ExchangeRateService coverage', () => {
  const config = { get: jest.fn() };
  const http = { get: jest.fn() };
  const db = {
    select: jest.fn(),
    insert: jest.fn(),
    execute: jest.fn(),
  };
  let service: ExchangeRateService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T03:00:00.000Z'));
    selectQueue.length = 0;
    config.get.mockImplementation((key: string) => ({
      EXCHANGE_RATE_API_KEY: 'api-key',
      EXCHANGE_RATE_API_URL: 'https://rates.test/latest',
    } as Record<string, string>)[key]);
    http.get.mockReturnValue(of({ data: { rates: { VND: 25000 } } }));
    db.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    db.insert.mockImplementation(() => makeInsertChain());
    db.execute.mockResolvedValue([]);
    service = new ExchangeRateService(config as any, http as any, { db } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('returns internal rates for identical currencies and cached rates when fresh', async () => {
    await expect(service.fetchRate('VND', 'VND')).resolves.toEqual({
      fromCurrency: 'VND',
      toCurrency: 'VND',
      rate: 1,
      source: 'internal',
      fetchedAt: '2026-05-21T03:00:00.000Z',
    });

    selectQueue.push([{ baseCurrency: 'USD', targetCurrency: 'VND', rate: 24900, source: 'cache', fetchedAt: '2026-05-21T02:30:00.000Z' }]);
    await expect(service.fetchRate('USD', 'VND')).resolves.toEqual({
      fromCurrency: 'USD',
      toCurrency: 'VND',
      rate: 24900,
      source: 'cache',
      fetchedAt: '2026-05-21T02:30:00.000Z',
    });
    expect(http.get).not.toHaveBeenCalled();
  });

  it('fetches and caches external rates when cache is missing or stale', async () => {
    selectQueue.push([{ baseCurrency: 'USD', targetCurrency: 'VND', rate: 24000, source: 'old', fetchedAt: '2026-05-21T00:00:00.000Z' }]);

    await expect(service.fetchRate('USD', 'VND')).resolves.toEqual({
      fromCurrency: 'USD',
      toCurrency: 'VND',
      rate: 25000,
      source: 'openexchangerates',
      fetchedAt: '2026-05-21T03:00:00.000Z',
    });
    expect(http.get).toHaveBeenCalledWith('https://rates.test/latest/USD', {
      params: { apikey: 'api-key' },
    });
    expect(db.insert).toHaveBeenCalled();
  });

  it('uses the default exchange-rate API URL when no configured URL exists', async () => {
    config.get.mockImplementation((key: string) => ({
      EXCHANGE_RATE_API_KEY: 'api-key',
    } as Record<string, string>)[key]);
    selectQueue.push([]);

    await expect(service.fetchRate('EUR', 'VND')).resolves.toMatchObject({
      fromCurrency: 'EUR',
      toCurrency: 'VND',
      rate: 25000,
    });
    expect(http.get).toHaveBeenCalledWith('https://open.er-api.com/v6/latest/EUR', {
      params: { apikey: 'api-key' },
    });
  });

  it('falls back to last known or ultimate fallback after external failures', async () => {
    const warnSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    http.get.mockImplementation(() => {
      throw new Error('network down');
    });

    selectQueue.push([], [{ baseCurrency: 'USD', targetCurrency: 'VND', rate: 24500, source: 'old', fetchedAt: '2026-05-20T00:00:00.000Z' }]);
    await expect(service.fetchRate('USD', 'VND')).resolves.toEqual({
      fromCurrency: 'USD',
      toCurrency: 'VND',
      rate: 24500,
      source: 'cached',
      fetchedAt: '2026-05-20T00:00:00.000Z',
    });

    selectQueue.push([], []);
    await expect(service.fetchRate('EUR', 'VND')).resolves.toEqual({
      fromCurrency: 'EUR',
      toCurrency: 'VND',
      rate: 1,
      source: 'fallback',
      fetchedAt: '2026-05-21T03:00:00.000Z',
    });
    expect(warnSpy).toHaveBeenCalledWith('Failed to fetch exchange rate: network down');
  });

  it('falls back when an external provider response does not contain the requested rate', async () => {
    const warnSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    http.get.mockReturnValue(of({ data: { rates: {} } }));
    selectQueue.push([], []);

    await expect(service.fetchRate('USD', 'JPY')).resolves.toEqual({
      fromCurrency: 'USD',
      toCurrency: 'JPY',
      rate: 1,
      source: 'fallback',
      fetchedAt: '2026-05-21T03:00:00.000Z',
    });
    expect(warnSpy).toHaveBeenCalledWith('Failed to fetch exchange rate: Rate not found for JPY');
  });

  it('converts amounts, logs audit rows, and lists supported currencies', async () => {
    jest.spyOn(service, 'fetchRate').mockResolvedValueOnce({
      fromCurrency: 'USD',
      toCurrency: 'VND',
      rate: 25000.1234,
      source: 'test',
      fetchedAt: '2026-05-21T03:00:00.000Z',
    });

    await expect(service.convert(2, 'USD', 'VND', 'tenant-1')).resolves.toEqual({
      convertedAmount: 50000.25,
      rate: 25000.1234,
      source: 'test',
      timestamp: '2026-05-21T03:00:00.000Z',
    });
    expect(db.execute).toHaveBeenCalled();
    expect(service.getSupportedCurrencies().map((currency) => currency.code)).toEqual([
      'VND',
      'USD',
      'EUR',
      'JPY',
      'GBP',
      'CNY',
      'KRW',
      'THB',
      'SGD',
      'AUD',
    ]);
  });
});
