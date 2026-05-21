const mockDb = {
  execute: jest.fn(),
  select: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  orders: {},
  orderItems: {},
  products: { tenantId: 'products.tenantId', isActive: 'products.isActive', stock: 'products.stock' },
  customers: {},
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  gte: jest.fn((field, value) => ({ op: 'gte', field, value })),
  lte: jest.fn((field, value) => ({ op: 'lte', field, value })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
}));

import { ReportsService } from './reports.service';

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => Promise.resolve(rows)),
  };
  return chain;
};

describe('ReportsService coverage', () => {
  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsService();
  });

  it('maps revenue, profit, product, customer, and summary report rows', async () => {
    const from = new Date('2026-05-01T00:00:00.000Z');
    const to = new Date('2026-05-31T00:00:00.000Z');
    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ period: '2026-05', order_count: 2, revenue: '1200.5', net_revenue: null }] })
      .mockResolvedValueOnce({ rows: [{ period: '2026-05-01', revenue: '1000', cost: '600', profit: '400' }, { period: '2026-05-02', revenue: '0', cost: '0', profit: '0' }] })
      .mockResolvedValueOnce({ rows: [{ product_id: 'p1', product_name: 'Coffee', product_sku: 'CF', sold: 3, revenue: '900', cost: '300' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'c1', name: 'Lan', phone: '090', customer_group: 'VIP', order_count: 2, total_spent: '2000', last_order_at: '2026-05-20' }] })
      .mockResolvedValueOnce({ rows: [{ order_count: 5, revenue: '5000', collected: '4000', outstanding_debt: null }] });

    await expect(service.getRevenueReport('tenant-1', from, to, 'month')).resolves.toEqual([
      { period: '2026-05', orderCount: 2, revenue: 1200.5, netRevenue: 0 },
    ]);
    await expect(service.getProfitReport('tenant-1', from, to)).resolves.toEqual([
      { period: '2026-05-01', revenue: 1000, cost: 600, profit: 400, margin: 40 },
      { period: '2026-05-02', revenue: 0, cost: 0, profit: 0, margin: 0 },
    ]);
    await expect(service.getTopProducts('tenant-1', from, to, 5)).resolves.toEqual([
      { productId: 'p1', name: 'Coffee', sku: 'CF', sold: 3, revenue: 900, cost: 300, profit: 600 },
    ]);
    await expect(service.getCustomerReport('tenant-1', from, to)).resolves.toEqual([
      { id: 'c1', name: 'Lan', phone: '090', group: 'VIP', orderCount: 2, totalSpent: 2000, lastOrderAt: '2026-05-20' },
    ]);
    await expect(service.getSummary('tenant-1', from, to)).resolves.toEqual({
      orderCount: 5,
      revenue: 5000,
      collected: 4000,
      outstandingDebt: 0,
    });
  });

  it('summarizes inventory value and low-stock products', async () => {
    mockDb.select.mockReturnValueOnce(makeSelectChain([
      { id: 'p1', name: 'A', sku: 'A', stock: 0, minStock: 2, unit: 'pcs', cost: '10' },
      { id: 'p2', name: 'B', sku: 'B', stock: 2, minStock: 2, unit: 'pcs', cost: '20' },
      { id: 'p3', name: 'C', sku: 'C', stock: 10, minStock: 2, unit: 'pcs', cost: null },
    ]));

    await expect(service.getInventoryReport('tenant-1')).resolves.toEqual({
      totalProducts: 3,
      totalStockValue: 40,
      lowStockCount: 2,
      outOfStockCount: 1,
      lowStockItems: [
        { id: 'p1', name: 'A', sku: 'A', stock: 0, minStock: 2, unit: 'pcs' },
        { id: 'p2', name: 'B', sku: 'B', stock: 2, minStock: 2, unit: 'pcs' },
      ],
    });
  });

  it('uses defaults and zero fallbacks for empty report values', async () => {
    const from = new Date('2026-05-01T00:00:00.000Z');
    const to = new Date('2026-05-31T00:00:00.000Z');
    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ period: '2026-05-01', order_count: 0, revenue: null, net_revenue: null }] })
      .mockResolvedValueOnce({ rows: [{ period: '2026-05-01', revenue: null, cost: null, profit: null }] })
      .mockResolvedValueOnce({ rows: [{ product_id: 'p-empty', product_name: 'Empty', product_sku: 'EMPTY', sold: 0, revenue: null, cost: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 'c-empty', name: 'No Orders', phone: null, customer_group: null, order_count: null, total_spent: null, last_order_at: null }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(service.getRevenueReport('tenant-1', from, to)).resolves.toEqual([
      { period: '2026-05-01', orderCount: 0, revenue: 0, netRevenue: 0 },
    ]);
    await expect(service.getProfitReport('tenant-1', from, to)).resolves.toEqual([
      { period: '2026-05-01', revenue: 0, cost: 0, profit: 0, margin: 0 },
    ]);
    await expect(service.getTopProducts('tenant-1', from, to)).resolves.toEqual([
      { productId: 'p-empty', name: 'Empty', sku: 'EMPTY', sold: 0, revenue: 0, cost: 0, profit: 0 },
    ]);
    await expect(service.getCustomerReport('tenant-1', from, to)).resolves.toEqual([
      { id: 'c-empty', name: 'No Orders', phone: null, group: null, orderCount: 0, totalSpent: 0, lastOrderAt: null },
    ]);
    await expect(service.getSummary('tenant-1', from, to)).resolves.toEqual({
      orderCount: 0,
      revenue: 0,
      collected: 0,
      outstandingDebt: 0,
    });
  });

  it('treats missing min stock as zero in inventory reports', async () => {
    mockDb.select.mockReturnValueOnce(makeSelectChain([
      { id: 'p-zero', name: 'Zero Min', sku: 'ZERO', stock: 0, unit: 'pcs', cost: '5' },
      { id: 'p-positive', name: 'Positive', sku: 'POS', stock: 1, unit: 'pcs', cost: '5' },
    ]));

    await expect(service.getInventoryReport('tenant-1')).resolves.toMatchObject({
      totalProducts: 2,
      totalStockValue: 5,
      lowStockCount: 1,
      outOfStockCount: 1,
      lowStockItems: [
        expect.objectContaining({ id: 'p-zero', minStock: undefined }),
      ],
    });
  });
});
