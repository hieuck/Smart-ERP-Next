const mockDb = {
  execute: jest.fn(),
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));
jest.mock('@smart-erp/database/schema', () => ({
  inventoryReorderSuggestions: {
    currentStock: 'suggestions.currentStock',
    id: 'suggestions.id',
    priority: 'suggestions.priority',
    productId: 'suggestions.productId',
    reason: 'suggestions.reason',
    status: 'suggestions.status',
    suggestedQuantity: 'suggestions.suggestedQuantity',
    tenantId: 'suggestions.tenantId',
  },
  products: {
    id: 'products.id',
    name: 'products.name',
  },
  supplierLeadTimes: {},
}));
jest.mock('@smart-erp/database/drizzle', () => ({
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { ScmService } from './scm.service';

const makeInsertChain = (returned: any[]) => {
  const chain: any = {
    onConflictDoUpdate: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returned)),
    values: jest.fn(() => chain),
  };
  return chain;
};

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    innerJoin: jest.fn(() => chain),
    orderBy: jest.fn(() => Promise.resolve(rows)),
    where: jest.fn(() => chain),
  };
  return chain;
};

const makeUpdateChain = (rows: any[]) => {
  const chain: any = {
    returning: jest.fn(() => Promise.resolve(rows)),
    set: jest.fn(() => chain),
    where: jest.fn(() => chain),
  };
  return chain;
};

describe('ScmService coverage', () => {
  let service: ScmService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScmService();
  });

  it('generates reorder suggestions for products below the reorder point', async () => {
    const insertedSuggestion = { id: 'suggestion-1', priority: 'high' };
    const insertChain = makeInsertChain([insertedSuggestion]);
    mockDb.execute.mockResolvedValueOnce([
      { avg_lead_time_days: 4, current_stock: 5, daily_velocity: 3, product_id: 'product-1' },
      { avg_lead_time_days: 2, current_stock: 100, daily_velocity: 1, product_id: 'product-2' },
    ]);
    mockDb.insert.mockReturnValue(insertChain);

    await expect(service.generateReorderSuggestions('tenant-1')).resolves.toEqual([insertedSuggestion]);

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        aiModelUsed: 'Heuristic-Velocity-V1',
        confidence: '0.85',
        currentStock: '5',
        priority: 'high',
        productId: 'product-1',
        suggestedQuantity: '90',
        tenantId: 'tenant-1',
      }),
    );
    expect(insertChain.values.mock.calls[0][0].reason).toContain('Dự báo hết hàng');
  });

  it('uses defaults for missing lead time and medium priority reorder suggestions', async () => {
    const insertChain = makeInsertChain([{ id: 'suggestion-2', priority: 'medium' }]);
    mockDb.execute.mockResolvedValueOnce([
      { avg_lead_time_days: null, current_stock: 20, daily_velocity: 2, product_id: 'product-1' },
    ]);
    mockDb.insert.mockReturnValue(insertChain);

    await expect(service.generateReorderSuggestions('tenant-1')).resolves.toEqual([
      { id: 'suggestion-2', priority: 'medium' },
    ]);

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 'medium',
        suggestedQuantity: '60',
      }),
    );
  });

  it('uses a one-day fallback reason when sales velocity is zero', async () => {
    const insertChain = makeInsertChain([{ id: 'suggestion-zero', priority: 'high' }]);
    mockDb.execute.mockResolvedValueOnce([
      { avg_lead_time_days: null, current_stock: 0, daily_velocity: 0, product_id: 'product-zero' },
    ]);
    mockDb.insert.mockReturnValue(insertChain);

    await expect(service.generateReorderSuggestions('tenant-1')).resolves.toEqual([
      { id: 'suggestion-zero', priority: 'high' },
    ]);

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 'high',
        productId: 'product-zero',
        suggestedQuantity: '50',
      }),
    );
    expect(insertChain.values.mock.calls[0][0].reason).toContain('1 ngày');
  });

  it('lists and approves pending reorder suggestions', async () => {
    const selectChain = makeSelectChain([{ id: 'suggestion-1', productName: 'Coffee' }]);
    const updateChain = makeUpdateChain([{ id: 'suggestion-1', status: 'approved' }]);
    mockDb.select.mockReturnValue(selectChain);
    mockDb.update.mockReturnValue(updateChain);

    await expect(service.listSuggestions('tenant-1')).resolves.toEqual([
      { id: 'suggestion-1', productName: 'Coffee' },
    ]);
    await expect(service.approveSuggestion('tenant-1', 'suggestion-1')).resolves.toEqual([
      { id: 'suggestion-1', status: 'approved' },
    ]);

    expect(selectChain.innerJoin).toHaveBeenCalled();
    expect(selectChain.orderBy).toHaveBeenCalled();
    expect(updateChain.set).toHaveBeenCalledWith({ status: 'approved', updatedAt: expect.any(Date) });
  });
});
