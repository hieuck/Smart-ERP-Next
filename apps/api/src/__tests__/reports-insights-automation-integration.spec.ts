jest.mock('@smart-erp/database', () => {
  const chainFn = jest.fn(() => db);
  const db: any = () => db;
  db.select = chainFn;
  db.from = chainFn;
  db.where = chainFn;
  db.innerJoin = chainFn;
  db.orderBy = chainFn;
  db.limit = chainFn;
  db.offset = chainFn;
  db.groupBy = chainFn;
  db.insert = chainFn;
  db.values = chainFn;
  db.update = chainFn;
  db.set = chainFn;
  db.delete = chainFn;
  db.returning = jest.fn();
  db.execute = jest.fn();
  db.then = jest.fn();
  return { db, orders: {}, crmLeads: {}, e_contracts: {}, reportTemplates: {} };
});
jest.mock('@smart-erp/database/schema', () => ({
  orders: {}, orderItems: {}, products: {}, customers: {},
  reportTemplates: {}, crmLeads: {}, e_contracts: {},
}));
jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn(), and: jest.fn(), gte: jest.fn(), lte: jest.fn(),
  desc: jest.fn(), sql: jest.fn(),
}));
jest.mock('drizzle-orm', () => {
  const sqlFn: any = jest.fn(() => '');
  sqlFn.raw = jest.fn((s: string) => s);
  return { eq: jest.fn(), and: jest.fn(), desc: jest.fn(), gte: jest.fn(), sql: sqlFn };
});

import { BadRequestException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { ReportsService } from '../reports/reports.service';
import { ReportEngineService } from '../reports/report-engine.service';
import { InsightsService } from '../insights/insights.service';
import { AutomationService } from '../automation/automation.service';
import { AiCopilotService } from '../ai-copilot/ai-copilot.service';
import { ForecastService } from '../forecast/forecast.service';

const TENANT_ID = 'tenant-1';

function makeSelectChain(rows: any[]) {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    offset: jest.fn(() => chain),
    groupBy: jest.fn(() => chain),
    then: jest.fn((onFulfilled?: any) => Promise.resolve(rows).then(onFulfilled)),
  };
  return chain;
}

function makeInsertChain(returningQueue: any[][]) {
  const chain: any = {
    values: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
  };
  return chain;
}

function createDrizzleMock() {
  const selectQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return {
    selectQueue,
    returningQueue,
    drizzle: {
      db: {
        select: jest.fn(() => makeSelectChain(selectQueue.shift() ?? [])),
        from: jest.fn(),
        insert: jest.fn(() => makeInsertChain(returningQueue)),
        execute: jest.fn(),
      },
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// ReportsService (direct db)
// ────────────────────────────────────────────────────────────────────────────
describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    (db as any).then.mockImplementation((resolve: any) => resolve([]));
    (db as any).execute.mockResolvedValue({ rows: [] });
    service = new ReportsService();
  });

  describe('getRevenueReport', () => {
    it('returns mapped revenue data from db.execute', async () => {
      const mockRows = [
        { period: new Date('2025-01-01'), order_count: 10, revenue: '5000', net_revenue: '4800' },
        { period: new Date('2025-01-02'), order_count: 5, revenue: '2500', net_revenue: '2400' },
      ];
      (db as any).execute.mockResolvedValue({ rows: mockRows });

      const result = await service.getRevenueReport(TENANT_ID, new Date('2025-01-01'), new Date('2025-01-31'));

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ period: mockRows[0].period, orderCount: 10, revenue: 5000, netRevenue: 4800 });
      expect(result[1]).toEqual({ period: mockRows[1].period, orderCount: 5, revenue: 2500, netRevenue: 2400 });
    });

    it('returns empty array when no data', async () => {
      const result = await service.getRevenueReport(TENANT_ID, new Date('2025-01-01'), new Date('2025-01-31'));
      expect(result).toEqual([]);
    });
  });

  describe('getProfitReport', () => {
    it('returns profit data with margin calculation', async () => {
      const mockRows = [
        { period: new Date('2025-01-01'), revenue: '1000', cost: '600', profit: '400' },
        { period: new Date('2025-01-02'), revenue: '2000', cost: '1500', profit: '500' },
      ];
      (db as any).execute.mockResolvedValue({ rows: mockRows });

      const result = await service.getProfitReport(TENANT_ID, new Date('2025-01-01'), new Date('2025-01-31'));

      expect(result[0].margin).toBe(40.0);
      expect(result[1].margin).toBe(25.0);
    });
  });

  describe('getTopProducts', () => {
    it('returns mapped top products with profit', async () => {
      const mockRows = [
        { product_id: 'p1', product_name: 'A', product_sku: 'SKU-A', sold: 20, revenue: '2000', cost: '1200' },
      ];
      (db as any).execute.mockResolvedValue({ rows: mockRows });

      const result = await service.getTopProducts(TENANT_ID, new Date('2025-01-01'), new Date('2025-01-31'), 5);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ productId: 'p1', name: 'A', sku: 'SKU-A', sold: 20, revenue: 2000, cost: 1200, profit: 800 });
    });
  });

  describe('getInventoryReport', () => {
    it('returns aggregated inventory report from products table', async () => {
      const productsData = [
        { id: 'p1', name: 'P1', sku: 'S1', stock: 10, minStock: 5, unit: 'pcs', cost: '100', tenantId: TENANT_ID, isActive: true },
        { id: 'p2', name: 'P2', sku: 'S2', stock: 2, minStock: 3, unit: 'pcs', cost: '200', tenantId: TENANT_ID, isActive: true },
        { id: 'p3', name: 'P3', sku: 'S3', stock: 0, minStock: 5, unit: 'pcs', cost: '50', tenantId: TENANT_ID, isActive: true },
      ];
      (db as any).then.mockImplementation((resolve: any) => resolve(productsData));

      const result = await service.getInventoryReport(TENANT_ID);

      expect(result.totalProducts).toBe(3);
      expect(result.totalStockValue).toBe(10 * 100 + 2 * 200 + 0 * 50);
      expect(result.lowStockCount).toBe(2);
      expect(result.outOfStockCount).toBe(1);
      expect(result.lowStockItems).toHaveLength(2);
    });
  });

  describe('getCustomerReport', () => {
    it('returns mapped customer report', async () => {
      const mockRows = [
        { id: 'c1', name: 'C1', phone: '0912345678', customer_group: 'vip', order_count: 5, total_spent: '10000', last_order_at: new Date('2025-01-15') },
      ];
      (db as any).execute.mockResolvedValue({ rows: mockRows });

      const result = await service.getCustomerReport(TENANT_ID, new Date('2025-01-01'), new Date('2025-01-31'));

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'c1', name: 'C1', phone: '0912345678', group: 'vip', orderCount: 5, totalSpent: 10000 });
    });
  });

  describe('getSummary', () => {
    it('returns summary stats from db.execute', async () => {
      (db as any).execute.mockResolvedValue({
        rows: [{ order_count: 15, revenue: '30000', collected: '25000', outstanding_debt: '5000' }],
      });

      const result = await service.getSummary(TENANT_ID, new Date('2025-01-01'), new Date('2025-01-31'));

      expect(result).toEqual({ orderCount: 15, revenue: 30000, collected: 25000, outstandingDebt: 5000 });
    });

    it('returns zeros when no data', async () => {
      const result = await service.getSummary(TENANT_ID, new Date('2025-01-01'), new Date('2025-01-31'));
      expect(result).toEqual({ orderCount: 0, revenue: 0, collected: 0, outstandingDebt: 0 });
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// ReportEngineService (DrizzleService DI)
// ────────────────────────────────────────────────────────────────────────────
describe('ReportEngineService', () => {
  function makeService(overrides?: { executeResolve?: any }) {
    const { selectQueue, returningQueue, drizzle } = createDrizzleMock();
    if (overrides?.executeResolve !== undefined) {
      drizzle.db.execute.mockResolvedValue(overrides.executeResolve);
    }
    return { selectQueue, returningQueue, drizzle, service: new ReportEngineService(drizzle as any) };
  }

  describe('createTemplate', () => {
    it('creates and returns a new template', async () => {
      const { returningQueue, service } = makeService();
      returningQueue.push([{ id: 'tmpl-1', name: 'Revenue', tenantId: TENANT_ID }]);

      const result = await service.createTemplate(TENANT_ID, {
        name: 'Revenue', description: 'Monthly revenue',
        querySql: 'select * from orders', parameters: {}, outputSchema: {},
      });

      expect(result).toEqual({ id: 'tmpl-1', name: 'Revenue', tenantId: TENANT_ID });
    });
  });

  describe('getAllTemplates', () => {
    it('returns all templates for tenant', async () => {
      const { selectQueue, service } = makeService();
      selectQueue.push([{ id: 'tmpl-1', name: 'Revenue' }]);

      const result = await service.getAllTemplates(TENANT_ID);
      expect(result).toEqual([{ id: 'tmpl-1', name: 'Revenue' }]);
    });
  });

  describe('getTemplate', () => {
    it('returns a template by id', async () => {
      const { selectQueue, service } = makeService();
      selectQueue.push([{ id: 'tmpl-1' }]);

      const result = await service.getTemplate(TENANT_ID, 'tmpl-1');
      expect(result).toEqual({ id: 'tmpl-1' });
    });

    it('throws BadRequestException when not found', async () => {
      const { selectQueue, service } = makeService();
      selectQueue.push([]);

      await expect(service.getTemplate(TENANT_ID, 'missing')).rejects.toThrow(BadRequestException);
    });
  });

  describe('runTemplate', () => {
    it('replaces placeholders and executes SQL', async () => {
      const { selectQueue, drizzle, service } = makeService({ executeResolve: { rows: [{ id: 'row-1', total: 100 }] } });
      selectQueue.push([{ id: 'tmpl-1', querySql: 'SELECT * FROM orders WHERE tenant_id = :tenantId AND status = :status' }]);

      const result = await service.runTemplate(TENANT_ID, 'tmpl-1', { status: 'active' });

      expect(result).toEqual([{ id: 'row-1', total: 100 }]);
    });

    it('escapes string parameters', async () => {
      const { selectQueue, drizzle, service } = makeService({ executeResolve: { rows: [] } });
      selectQueue.push([{ id: 'tmpl-1', querySql: "SELECT * FROM orders WHERE name = :name" }]);

      await service.runTemplate(TENANT_ID, 'tmpl-1', { name: "O'Brien" });

      expect(drizzle.db.execute).toHaveBeenCalled();
    });
  });

  describe('getRevenueReportSql (static)', () => {
    it('returns SQL with placeholders', () => {
      const sql = ReportEngineService.getRevenueReportSql();
      expect(sql).toContain(':tenantId');
      expect(sql).toContain(':startDate');
      expect(sql).toContain(':endDate');
      expect(sql).toContain('date_trunc');
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// InsightsService (direct db)
// ────────────────────────────────────────────────────────────────────────────
describe('InsightsService', () => {
  let service: InsightsService;

  beforeEach(() => {
    jest.clearAllMocks();
    (db as any).then.mockImplementation((resolve: any) => resolve([]));
    (db as any).execute.mockResolvedValue({ rows: [] });
    service = new InsightsService();
  });

  describe('getDashboardInsights', () => {
    it('returns dashboard with metrics and insights', async () => {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const mockTodayOrders = [
        { id: 'o1', createdAt: todayStart, total: '100000', tenantId: TENANT_ID, code: 'ORD-001', status: 'delivered' },
        { id: 'o2', createdAt: todayStart, total: '50000', tenantId: TENANT_ID, code: 'ORD-002', status: 'delivered' },
      ];

      const thenData = [
        mockTodayOrders,
        [],
        [{ customerCount: 25 }],
        [{ lowStockCount: 3 }],
        mockTodayOrders,
        mockTodayOrders.slice(0, 1),
        [],
      ];
      let thenIdx = 0;
      (db as any).then.mockImplementation((resolve: any) => {
        resolve(thenData[thenIdx++] ?? []);
      });
      (db as any).execute.mockResolvedValue({
        rows: [{ product_id: 'p1', product_name: 'P1', product_sku: 'SKU1', sold: 10, revenue: '100000' }],
      });

      const result = await service.getDashboardInsights(TENANT_ID);

      expect(result.todayRevenue).toBe(150000);
      expect(result.todayOrders).toBe(2);
      expect(result.totalCustomers).toBe(25);
      expect(result.lowStockCount).toBe(3);
      expect(result.metrics.revenueTrend).toBeDefined();
      expect(result.metrics.predictedNextMonth).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.generatedAt).toBeDefined();
    });

    it('adds revenue alert insight when trend drops below -20%', async () => {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const mockTodayOrders = [{ id: 'o1', createdAt: todayStart, total: '10000', tenantId: TENANT_ID, code: 'ORD-001', status: 'delivered' }];
      const mockYesterdayOrders = [
        { id: 'o2', createdAt: new Date(todayStart.getTime() - 1), total: '50000', tenantId: TENANT_ID, code: 'ORD-003', status: 'delivered' },
      ];

      const thenData = [
        mockTodayOrders,
        mockYesterdayOrders,
        [{ customerCount: 5 }],
        [{ lowStockCount: 0 }],
        [],
        [],
        [],
      ];
      let thenIdx = 0;
      (db as any).then.mockImplementation((resolve: any) => {
        resolve(thenData[thenIdx++] ?? []);
      });
      (db as any).execute.mockResolvedValue({ rows: [] });

      const result = await service.getDashboardInsights(TENANT_ID);

      expect(result.metrics.revenueTrend).toBeLessThan(0);
      const warningInsight = result.insights.find((i: any) => i.type === 'warning');
      expect(warningInsight).toBeDefined();
    });

    it('shows stable insight when no warnings detected', async () => {
      const thenData = [
        [],
        [],
        [{ customerCount: 1 }],
        [{ lowStockCount: 0 }],
        [],
        [],
        [],
      ];
      let thenIdx = 0;
      (db as any).then.mockImplementation((resolve: any) => {
        resolve(thenData[thenIdx++] ?? []);
      });
      (db as any).execute.mockResolvedValue({ rows: [] });

      const result = await service.getDashboardInsights(TENANT_ID);
      expect(result.insights.some((i: any) => i.message.includes('stable'))).toBe(true);
    });
  });

  describe('getForecast', () => {
    it('returns forecast for active products', async () => {
      const mockProducts = [
        { id: 'p1', name: 'P1', price: '100', tenantId: TENANT_ID, isActive: true },
        { id: 'p2', name: 'P2', price: '200', tenantId: TENANT_ID, isActive: true },
      ];
      (db as any).then.mockImplementation((resolve: any) => resolve(mockProducts));
      jest.spyOn(ForecastService.prototype, 'getMonthlyDemand').mockResolvedValue({
        predictions: [{ quantity: 10 }, { quantity: 20 }],
        source: 'builtin',
      });

      const result = await service.getForecast(TENANT_ID, 2);

      expect(result.forecast).toHaveLength(2);
      expect(result.forecast[0].productId).toBe('p1');
      expect(result.forecast[0].forecastedDemand).toEqual([10, 20]);
      expect(result.forecast[0].source).toBe('builtin');
    });
  });

  describe('predictNextMonthRevenue', () => {
    it('returns 0 when fewer than 2 months of data', async () => {
      (db as any).then.mockImplementation((resolve: any) => resolve([]));
      const result = await service.predictNextMonthRevenue(TENANT_ID);
      expect(result).toBe(0);
    });

    it('predicts next month using linear regression', async () => {
      const now = new Date();
      const ordersData = [
        { createdAt: new Date(now.getFullYear(), now.getMonth() - 2, 15), total: '1000', tenantId: TENANT_ID },
        { createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 15), total: '2000', tenantId: TENANT_ID },
        { createdAt: new Date(now.getFullYear(), now.getMonth(), 1), total: '3000', tenantId: TENANT_ID },
      ];
      (db as any).then.mockImplementation((resolve: any) => resolve(ordersData));

      const result = await service.predictNextMonthRevenue(TENANT_ID);
      expect(result).toBeGreaterThan(0);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AutomationService (DrizzleService DI)
// ────────────────────────────────────────────────────────────────────────────
describe('AutomationService', () => {
  let service: AutomationService;

  beforeEach(() => {
    const { drizzle } = createDrizzleMock();
    service = new AutomationService(drizzle as any);
  });

  describe('listWorkflows', () => {
    it('returns empty array', async () => {
      const result = await service.listWorkflows(TENANT_ID);
      expect(result).toEqual([]);
    });
  });

  describe('createWorkflow', () => {
    it('creates a workflow with generated id and timestamps', async () => {
      const result = await service.createWorkflow(TENANT_ID, {
        name: 'Test Workflow',
        description: 'A test',
        triggerType: 'webhook',
        triggerEvent: 'order.created',
        steps: [{ type: 'send_notification', config: { message: 'Hi' } }],
      });

      expect(result.id).toBeDefined();
      expect(result.tenantId).toBe(TENANT_ID);
      expect(result.name).toBe('Test Workflow');
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('toggleWorkflow', () => {
    it('updates isActive status', async () => {
      const result = await service.toggleWorkflow(TENANT_ID, 'wf-1', false);
      expect(result.id).toBe('wf-1');
      expect(result.isActive).toBe(false);
    });
  });

  describe('getAvailableTriggers', () => {
    it('returns predefined triggers', async () => {
      const result = await service.getAvailableTriggers();
      expect(result).toHaveLength(6);
      expect(result[0]).toMatchObject({ key: 'order.created', label: 'New Order Created' });
    });
  });

  describe('getAvailableActions', () => {
    it('returns predefined actions', async () => {
      const result = await service.getAvailableActions();
      expect(result).toHaveLength(5);
      expect(result.some((a: any) => a.key === 'send_email')).toBe(true);
    });
  });

  describe('executeWorkflow', () => {
    it('returns execution result with timestamp', async () => {
      const result = await service.executeWorkflow('wf-1', { event: 'test' });
      expect(result.workflowId).toBe('wf-1');
      expect(result.executed).toBe(true);
      expect(result.timestamp).toBeDefined();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// AiCopilotService (DrizzleService DI)
// ────────────────────────────────────────────────────────────────────────────
describe('AiCopilotService', () => {
  let service: AiCopilotService;
  let drizzleMock: ReturnType<typeof createDrizzleMock>;

  function setupExecInsights(
    revenue: number, leads: number, highPriority: number, signed: number,
  ) {
    const { drizzle } = drizzleMock;
    drizzle.db.execute = jest.fn();
    const selectQueue = drizzle.db.select as jest.Mock;

    selectQueue
      .mockReturnValueOnce(makeSelectChain([{ total: revenue }]))
      .mockReturnValueOnce(makeSelectChain([{ count: leads }]))
      .mockReturnValueOnce(makeSelectChain([{ count: highPriority }]))
      .mockReturnValueOnce(makeSelectChain([{ count: signed }]));
  }

  beforeEach(() => {
    drizzleMock = createDrizzleMock();
    service = new AiCopilotService(drizzleMock.drizzle as any);
  });

  describe('getExecutiveInsights', () => {
    it('returns insights with on track health when metrics are good', async () => {
      setupExecInsights(200_000_000, 3, 2, 5);

      const result = await service.getExecutiveInsights(TENANT_ID);

      expect(result.revenue).toBe(200_000_000);
      expect(result.leadsCount).toBe(3);
      expect(result.highPriority).toBe(2);
      expect(result.signedCount).toBe(5);
      expect(result.healthStatus).toBe('on track');
      expect(result.recommendations).toHaveLength(0);
    });

    it('flags needs attention when highPriority > 5', async () => {
      setupExecInsights(200_000_000, 15, 8, 5);

      const result = await service.getExecutiveInsights(TENANT_ID);

      expect(result.healthStatus).toBe('needs attention');
      expect(result.recommendations).toContain('High number of new leads. Review sales pipeline.');
    });

    it('adds revenue recommendation when below target', async () => {
      setupExecInsights(50000, 3, 2, 5);

      const result = await service.getExecutiveInsights(TENANT_ID);

      expect(result.recommendations).toContain('Revenue below target. Push CRM leads conversion.');
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// ForecastService tests moved to:
// - __tests__/forecast-real-data.spec.ts
// - forecast/forecast.service.coverage.spec.ts
