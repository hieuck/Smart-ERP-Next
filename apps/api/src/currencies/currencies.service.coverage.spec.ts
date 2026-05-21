const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  currencies: {
    id: 'currencies.id',
    tenantId: 'currencies.tenantId',
    code: 'currencies.code',
    isBaseCurrency: 'currencies.isBaseCurrency',
  },
  exchangeRates: {
    id: 'rates.id',
    fromCurrencyId: 'rates.fromCurrencyId',
    toCurrencyId: 'rates.toCurrencyId',
    effectiveDate: 'rates.effectiveDate',
    createdAt: 'rates.createdAt',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  gte: jest.fn((field, value) => ({ op: 'gte', field, value })),
  lte: jest.fn((field, value) => ({ op: 'lte', field, value })),
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';

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

describe('CurrenciesService coverage', () => {
  let service: CurrenciesService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T03:00:00.000Z'));
    selectQueue.length = 0;
    insertQueue.length = 0;
    updateQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain(insertQueue));
    mockDb.update.mockImplementation(() => makeWriteChain(updateQueue));
    mockDb.delete.mockImplementation(() => makeWriteChain());
    service = new CurrenciesService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates, lists, finds, updates, and removes currencies with guard rails', async () => {
    selectQueue.push([{ id: 'vnd-existing' }]);
    await expect(service.create('tenant-1', {
      code: 'VND',
      name: 'Vietnam Dong',
      symbol: 'd',
    } as any)).rejects.toBeInstanceOf(ConflictException);

    selectQueue.push([]);
    insertQueue.push([{ id: 'usd', code: 'USD', decimalPlaces: '2' }]);
    await expect(service.create('tenant-1', {
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      decimalPlaces: 2,
      isBaseCurrency: false,
    } as any)).resolves.toEqual({ id: 'usd', code: 'USD', decimalPlaces: '2' });

    selectQueue.push([]);
    insertQueue.push([{ id: 'eur', code: 'EUR', decimalPlaces: '2', isBaseCurrency: false }]);
    await expect(service.create('tenant-1', {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
    } as any)).resolves.toEqual({ id: 'eur', code: 'EUR', decimalPlaces: '2', isBaseCurrency: false });

    selectQueue.push([{ id: 'vnd', code: 'VND' }], [{ id: 'vnd', code: 'VND' }], []);
    await expect(service.findAll('tenant-1')).resolves.toEqual([{ id: 'vnd', code: 'VND' }]);
    await expect(service.findOne('tenant-1', 'vnd')).resolves.toEqual({ id: 'vnd', code: 'VND' });
    await expect(service.findOne('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);

    selectQueue.push([{ id: 'vnd', isBaseCurrency: true }], [{ id: 'usd', isBaseCurrency: false }]);
    updateQueue.push([{ id: 'vnd', name: 'Vietnamese Dong' }]);
    await expect(service.getBaseCurrency('tenant-1')).resolves.toEqual({ id: 'vnd', isBaseCurrency: true });
    await expect(service.update('tenant-1', 'vnd', { name: 'Vietnamese Dong' })).resolves.toEqual({
      id: 'vnd',
      name: 'Vietnamese Dong',
    });

    jest.spyOn(service, 'findOne').mockResolvedValueOnce(null as any);
    await expect(service.update('tenant-1', 'ghost', { name: 'Ghost' })).rejects.toBeInstanceOf(NotFoundException);

    selectQueue.push([{ id: 'vnd', isBaseCurrency: true }], [{ id: 'usd', isBaseCurrency: false }]);
    await expect(service.remove('tenant-1', 'vnd')).rejects.toBeInstanceOf(ConflictException);
    await expect(service.remove('tenant-1', 'usd')).resolves.toEqual({ success: true });
  });

  it('creates and reads exchange rates with validation branches', async () => {
    selectQueue.push([], [{ id: 'vnd' }]);
    await expect(service.createExchangeRate('tenant-1', {
      fromCurrency: 'USD',
      toCurrency: 'VND',
      rate: 25000,
    } as any)).rejects.toBeInstanceOf(NotFoundException);

    selectQueue.push([{ id: 'usd' }], [{ id: 'vnd' }]);
    await expect(service.createExchangeRate('tenant-1', {
      fromCurrency: 'USD',
      toCurrency: 'VND',
      rate: 25000,
      effectiveFrom: '2026-05-22',
      effectiveTo: '2026-05-21',
    } as any)).rejects.toBeInstanceOf(ConflictException);

    selectQueue.push([{ id: 'usd' }], [{ id: 'vnd' }]);
    insertQueue.push([{ id: 'rate-1', rate: '25000' }]);
    await expect(service.createExchangeRate('tenant-1', {
      fromCurrency: 'USD',
      toCurrency: 'VND',
      rate: 25000,
      effectiveFrom: '2026-05-21',
      effectiveTo: '2026-06-21',
    } as any)).resolves.toEqual({ id: 'rate-1', rate: '25000' });

    selectQueue.push([{ id: 'usd' }], [{ id: 'vnd' }]);
    insertQueue.push([{ id: 'rate-default-date', rate: '25100' }]);
    await expect(service.createExchangeRate('tenant-1', {
      fromCurrency: 'USD',
      toCurrency: 'VND',
      rate: 25100,
    } as any)).resolves.toEqual({ id: 'rate-default-date', rate: '25100' });

    selectQueue.push([{ id: 'usd' }], []);
    await expect(service.getExchangeRate('tenant-1', 'USD', 'VND')).rejects.toBeInstanceOf(NotFoundException);

    selectQueue.push([{ id: 'usd' }], [{ id: 'vnd' }], []);
    await expect(service.getExchangeRate('tenant-1', 'USD', 'VND', '2026-05-21')).rejects.toBeInstanceOf(NotFoundException);

    selectQueue.push([{ id: 'usd' }], [{ id: 'vnd' }], [{ id: 'rate-1', rate: '25000' }]);
    await expect(service.getExchangeRate('tenant-1', 'USD', 'VND')).resolves.toEqual({
      id: 'rate-1',
      rate: '25000',
    });
  });

  it('deduplicates current rates, updates/removes rates, and converts amounts', async () => {
    selectQueue.push([]);
    await expect(service.getExchangeRates('tenant-1', 'VND')).rejects.toBeInstanceOf(NotFoundException);

    selectQueue.push([{ id: 'vnd' }], [
      { id: 'rate-new', fromCurrencyId: 'usd', rate: '25000' },
      { id: 'rate-old', fromCurrencyId: 'usd', rate: '24500' },
      { id: 'rate-eur', fromCurrencyId: 'eur', rate: '27000' },
    ]);
    await expect(service.getExchangeRates('tenant-1', 'VND')).resolves.toEqual([
      { id: 'rate-new', fromCurrencyId: 'usd', rate: '25000' },
      { id: 'rate-eur', fromCurrencyId: 'eur', rate: '27000' },
    ]);

    selectQueue.push([{ id: 'vnd-default' }], []);
    await expect(service.getExchangeRates('tenant-1')).resolves.toEqual([]);

    selectQueue.push([]);
    await expect(service.updateExchangeRate('tenant-1', 'missing', { rate: 26000 } as any)).rejects.toBeInstanceOf(NotFoundException);

    selectQueue.push([{ id: 'rate-1' }]);
    updateQueue.push([{ id: 'rate-1', rate: '26000' }]);
    await expect(service.updateExchangeRate('tenant-1', 'rate-1', {
      rate: 26000,
      effectiveFrom: '2026-05-22',
    } as any)).resolves.toEqual({ id: 'rate-1', rate: '26000' });

    selectQueue.push([]);
    await expect(service.removeExchangeRate('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);

    selectQueue.push([{ id: 'rate-1' }]);
    await expect(service.removeExchangeRate('tenant-1', 'rate-1')).resolves.toEqual({ success: true });

    expect(await service.convertAmount('tenant-1', 100, 'VND', 'VND')).toBe(100);
    jest.spyOn(service, 'getExchangeRate').mockResolvedValueOnce({ rate: '25000' } as any);
    await expect(service.convertAmount('tenant-1', 2, 'USD', 'VND')).resolves.toBe(50000);
  });
});
