const mockDb = {
  insert: jest.fn(),
  select: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));
jest.mock('@smart-erp/database/schema', () => ({
  financeBudgetLines: { actualAmount: 'actual', budgetId: 'budgetId', category: 'category', plannedAmount: 'planned' },
  financeBudgets: { createdAt: 'createdAt', tenantId: 'tenantId' },
  financeCashflowForecasts: {},
  orders: { status: 'orders.status', tenantId: 'orders.tenantId' },
  purchaseOrders: { status: 'purchaseOrders.status', tenantId: 'purchaseOrders.tenantId' },
}));
jest.mock('@smart-erp/database/drizzle', () => ({
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { FinanceService } from './finance.service';

const selectChain = (rows: any[], terminal: 'where' | 'orderBy' = 'where') => {
  const chain: any = {
    from: jest.fn(() => chain),
    orderBy: jest.fn(() => Promise.resolve(rows)),
    where: jest.fn(() => (terminal === 'where' ? Promise.resolve(rows) : chain)),
  };
  return chain;
};
const insertChain = (rows: any[]) => {
  const chain: any = {
    returning: jest.fn(() => Promise.resolve(rows)),
    values: jest.fn(() => chain),
  };
  return chain;
};

describe('FinanceService coverage', () => {
  const service = new FinanceService();

  beforeEach(() => jest.clearAllMocks());

  it('generates forecasts, lists budgets, and calculates variances', async () => {
    const insert = insertChain([{ id: 'forecast-1' }]);
    mockDb.select
      .mockReturnValueOnce(selectChain([{ inflow: '1000' }]))
      .mockReturnValueOnce(selectChain([{ outflow: '250' }]))
      .mockReturnValueOnce(selectChain([{ id: 'budget-1' }], 'orderBy'))
      .mockReturnValueOnce(selectChain([
        { actualAmount: '30', category: 'Ads', plannedAmount: '100' },
        { actualAmount: null, category: 'Ops', plannedAmount: '0' },
      ]));
    mockDb.insert.mockReturnValueOnce(insert);

    await expect(service.generateForecast('tenant-1', '2026-05')).resolves.toEqual({ id: 'forecast-1' });
    expect(insert.values).toHaveBeenCalledWith(
      expect.objectContaining({ expectedInflow: '1000', expectedOutflow: '250', netCashflow: '750' }),
    );
    await expect(service.listBudgets('tenant-1')).resolves.toEqual([{ id: 'budget-1' }]);
    await expect(service.getBudgetVariance('tenant-1', 'budget-1')).resolves.toEqual([
      { actual: 30, category: 'Ads', percentSpent: 30, planned: 100, variance: 70 },
      { actual: 0, category: 'Ops', percentSpent: 0, planned: 0, variance: 0 },
    ]);
  });

  it('defaults empty cashflow values and actual budget amounts', async () => {
    const insert = insertChain([{ id: 'forecast-empty' }]);
    mockDb.select
      .mockReturnValueOnce(selectChain([{ inflow: null }]))
      .mockReturnValueOnce(selectChain([{ outflow: null }]))
      .mockReturnValueOnce(selectChain([
        { actualAmount: null, category: 'Ops', plannedAmount: '200' },
      ]));
    mockDb.insert.mockReturnValueOnce(insert);

    await expect(service.generateForecast('tenant-1', '2026-06')).resolves.toEqual({ id: 'forecast-empty' });
    expect(insert.values).toHaveBeenCalledWith(expect.objectContaining({
      expectedInflow: '0',
      expectedOutflow: '0',
      netCashflow: '0',
    }));
    await expect(service.getBudgetVariance('tenant-1', 'budget-2')).resolves.toEqual([
      { actual: 0, category: 'Ops', percentSpent: 0, planned: 200, variance: 200 },
    ]);
  });
});
