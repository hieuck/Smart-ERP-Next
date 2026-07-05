import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));
jest.mock('@smart-erp/database');

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  execute: jest.fn(),
};

jest.mock('@smart-erp/database', () => {
  const actual = jest.requireActual('@smart-erp/database');
  return { ...actual, db: mockDb };
});

jest.mock('@smart-erp/database/schema', () => {
  const actual = jest.requireActual('@smart-erp/database/schema');
  return actual;
});

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn().mockReturnValue(true),
    readdirSync: jest.fn().mockReturnValue([]),
    readFileSync: jest.fn().mockReturnValue('{}'),
  };
});

// ---- Service imports ----
import { TenantsService } from '../tenants/tenants.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { XeroService } from '../xero/xero.service';
import { I18nService } from '../i18n/i18n.service';
import { RbacService } from '../auth/rbac.service';
import { SyncService } from '../modules/sync/sync.service';
import { BenchmarkService } from '../modules/metrics/benchmark.service';
import { TransfersService, CreateTransferDto } from '../inventory/transfers.service';
import { ActivityService } from '../modules/activity/activity.service';
import { LotsService } from '../inventory/lots.service';
import { CustomerPortalService } from '../customers/customer-portal.service';
import { SupplierPortalService } from '../suppliers/supplier-portal.service';
import { SupplierCollaborationService } from '../suppliers/supplier-collaboration.service';
import { WarehouseMetricsService } from '../warehouses/warehouse-metrics.service';
import { ExchangeRateService } from '../currencies/exchange-rate.service';
import { NextBestActionService } from '../crm/next-best-action.service';
import { JournalEntriesService } from '../accounting/journal-entries.service';
import { NotificationService, SendNotification } from '../notifications/notification.service';
import { HealthMonitorService } from '../health/health-monitor.service';
import { DrizzleService } from '../drizzle/drizzle.service';
import { ChatbotService } from '../ai/chatbot.service';

import * as fs from 'fs';

const mockDrizzleService = { db: mockDb };

function makeQueryBuilder(returnValue: any) {
  const qb: any = {
    from: jest.fn(() => qb),
    where: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    limit: jest.fn(() => qb),
    offset: jest.fn(() => qb),
    groupBy: jest.fn(() => qb),
    leftJoin: jest.fn(() => qb),
    then: jest.fn((cb: any) => Promise.resolve(cb(returnValue))),
    values: jest.fn(() => qb),
    set: jest.fn(() => qb),
    returning: jest.fn(() => Promise.resolve(returnValue)),
  };
  qb.select = jest.fn(() => qb);
  qb.insert = jest.fn(() => qb);
  qb.update = jest.fn(() => qb);
  qb.delete = jest.fn(() => qb);
  return qb;
}

describe('Remaining Services Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // 1. TenantsService — direct db
  // ============================================================
  describe('TenantsService', () => {
    let service: TenantsService;

    beforeEach(() => {
      service = new TenantsService();
    });

    it('create inserts a tenant', async () => {
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([]));
      mockDb.insert.mockReturnValueOnce(makeQueryBuilder([{ id: '1', name: 'Test', slug: 'test' }]));
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([{ id: '1', name: 'Test', slug: 'test' }]));
      const result = await service.create({ name: 'Test', slug: 'test' } as any);
      expect(result).toEqual({ id: '1', name: 'Test', slug: 'test' });
    });

    it('create throws ConflictException for duplicate slug', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: '1' }]));
      await expect(service.create({ name: 'Test', slug: 'test' } as any)).rejects.toThrow(ConflictException);
    });

    it('findAll returns all tenants', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: '1' }]));
      expect(await service.findAll()).toEqual([{ id: '1' }]);
    });

    it('findOne returns a tenant', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: '1' }]));
      expect(await service.findOne('1')).toEqual({ id: '1' });
    });

    it('findOne throws NotFoundException', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([]));
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('findBySlug returns a tenant', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: '1', slug: 'test' }]));
      expect(await service.findBySlug('test')).toEqual({ id: '1', slug: 'test' });
    });

    it('update modifies a tenant', async () => {
      mockDb.update.mockReturnValue(makeQueryBuilder([{ id: '1', name: 'Updated' }]));
      expect(await service.update('1', { name: 'Updated' } as any)).toEqual({ id: '1', name: 'Updated' });
    });

    it('remove deletes a tenant', async () => {
      mockDb.delete.mockReturnValue(makeQueryBuilder([{ id: '1' }]));
      expect(await service.remove('1')).toEqual({ id: '1' });
    });
  });

  // ============================================================
  // 2. XeroService — direct db
  // ============================================================
  describe('XeroService', () => {
    let service: XeroService;

    beforeEach(() => {
      service = new XeroService();
    });

    it('getConnection returns a connection', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'c1', tenantId: 't1' }]));
      expect(await service.getConnection('t1')).toEqual({ id: 'c1', tenantId: 't1' });
    });

    it('saveConnection inserts new', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([]));
      mockDb.insert.mockReturnValue(makeQueryBuilder([]));
      await service.saveConnection('t1', { accessToken: 'tok' });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('saveConnection updates existing', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'c1' }]));
      mockDb.update.mockReturnValue(makeQueryBuilder([]));
      await service.saveConnection('t1', { accessToken: 'tok' });
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 3. I18nService — file-based
  // ============================================================
  describe('I18nService', () => {
    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['vi', 'en']);
      (fs.readFileSync as jest.Mock).mockImplementation((fp: string) => {
        if (fp.includes('vi')) return JSON.stringify({ hello: 'Xin chào', nested: { greeting: 'Chào {{name}}' } });
        if (fp.includes('en')) return JSON.stringify({ hello: 'Hello', goodbye: 'Goodbye' });
        return '{}';
      });
    });

    it('loads translations and translates keys', () => {
      const service = new I18nService();
      expect(service.t('hello')).toBe('Xin chào');
      expect(service.t('hello', 'en')).toBe('Hello');
      expect(service.t('nonexistent')).toBe('nonexistent');
      expect(service.t('nested.greeting', 'vi', { name: 'An' })).toBe('Chào An');
    });

    it('getAvailableLocales returns loaded locales', () => {
      (fs.readdirSync as jest.Mock).mockReturnValue(['vi', 'en', 'pt', 'ru']);
      const service = new I18nService();
      expect(service.getAvailableLocales()).toEqual(['vi', 'en', 'pt', 'ru']);
    });
  });

  // ============================================================
  // 4. RbacService — DrizzleService DI
  // ============================================================
  describe('RbacService', () => {
    let service: RbacService;

    beforeEach(() => {
      service = new RbacService(mockDrizzleService as any);
    });

    it('hasPermission returns true for staff read', async () => {
      expect(await service.hasPermission('t1', 'u1', 'customers:view')).toBe(true);
    });

    it('hasPermission returns false for missing permission', async () => {
      expect(await service.hasPermission('t1', 'u1', 'customers:edit' as any)).toBe(false);
    });

    it('getUserPermissions returns user permissions', async () => {
      const perms = await service.getUserPermissions('t1', 'u1');
      expect(perms).toContain('customers:view');
    });

    it('getUserRoles returns default roles', async () => {
      const roles = await service.getUserRoles('t1', 'u1');
      expect(roles).toHaveLength(1);
      expect(roles[0].name).toBe('staff');
    });

    it('createRole returns new role', async () => {
      const role = await service.createRole('t1', { name: 'custom', permissions: ['customers:view'] });
      expect(role.name).toBe('custom');
    });

    it('getAllPermissions returns grouped permissions', () => {
      expect(service.getAllPermissions().length).toBeGreaterThanOrEqual(5);
    });
  });

  // ============================================================
  // 5. SyncService — @InjectDatabase DI
  // ============================================================
  describe('SyncService', () => {
    let service: SyncService;

    beforeEach(() => {
      service = new SyncService(mockDb as any);
    });

    it('getMetadata returns metadata', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'm1', tenantId: 't1' }]));
      expect(await service.getMetadata('t1', 'c1')).toEqual({ id: 'm1', tenantId: 't1' });
    });

    it('updateMetadata inserts when none exists', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([]));
      mockDb.insert.mockReturnValue(makeQueryBuilder([]));
      await service.updateMetadata('t1', 'c1', { products: 1 });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('updateMetadata updates when exists', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'm1' }]));
      mockDb.update.mockReturnValue(makeQueryBuilder([]));
      await service.updateMetadata('t1', 'c1', { products: 1 });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('pull returns changes and vector clock', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([]));
      mockDb.insert.mockReturnValue(makeQueryBuilder([]));
      const result = await service.pull('t1', 'c1', {});
      expect(result).toHaveProperty('changes');
      expect(result).toHaveProperty('vectorClock');
    });

    it('push returns accepted', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([]));
      mockDb.insert.mockReturnValue(makeQueryBuilder([]));
      expect(await service.push('t1', 'c1', {})).toEqual({ accepted: true });
    });
  });

  // ============================================================
  // 6. BenchmarkService — @InjectDatabase DI
  // ============================================================
  describe('BenchmarkService', () => {
    let service: BenchmarkService;

    beforeEach(() => {
      service = new BenchmarkService(mockDb as any);
    });

    it('record inserts a benchmark', async () => {
      mockDb.insert.mockReturnValue(makeQueryBuilder([]));
      await service.record('t1', 'c1', '/sync', 'ok', 100);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('getStats returns stats and recent events', async () => {
      const qb = makeQueryBuilder([{ endpoint: '/sync', status: 'ok', p95: 50, p99: 100, avg: 30, count: 10 }]);
      mockDb.select.mockReturnValue(qb);
      const result = await service.getStats('t1');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('recentEvents');
    });

    it('getTimeseries returns time-bucketed results', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ time: new Date(), endpoint: '/sync', count: 10 }]));
      const result = await service.getTimeseries('t1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================
  // 7. TransfersService — ActivityService DI, direct db
  // ============================================================
  describe('TransfersService', () => {
    let service: TransfersService;
    let mockActivityService: jest.Mocked<ActivityService>;

    beforeEach(() => {
      mockActivityService = { log: jest.fn().mockResolvedValue({}) } as any;
      service = new TransfersService(mockActivityService as any);
    });

    it('create inserts transfer and items', async () => {
      mockDb.insert.mockReturnValue(makeQueryBuilder([{ id: 'tr1', tenantId: 't1', transferCode: 'TRF-ABC', status: 'draft' }]));
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'tr1' }]));
      const dto: CreateTransferDto = {
        fromWarehouseId: 'w1', toWarehouseId: 'w2',
        items: [{ productId: 'p1', quantityRequested: 5 }],
      };
      const result = await service.create('t1', 'u1', dto);
      expect(result).toBeDefined();
      expect(mockActivityService.log).toHaveBeenCalled();
    });

    it('create throws for same warehouse', async () => {
      const dto: CreateTransferDto = { fromWarehouseId: 'w1', toWarehouseId: 'w1', items: [] };
      await expect(service.create('t1', 'u1', dto)).rejects.toThrow('Cannot transfer');
    });

    it('findAll returns transfers', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'tr1' }]));
      expect(await service.findAll('t1', { status: 'draft' })).toEqual([{ id: 'tr1' }]);
    });

    it('findOne returns transfer with items', async () => {
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([{ id: 'tr1' }]));
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([]));
      const result = await service.findOne('t1', 'tr1');
      expect(result).toHaveProperty('items');
    });

    it('approve updates status', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'tr1', status: 'draft', transferCode: 'TF1' }]));
      mockDb.update.mockReturnValue(makeQueryBuilder([{ id: 'tr1', status: 'approved' }]));
      expect((await service.approve('t1', 'u1', 'tr1')).status).toBe('approved');
    });

    it('ship updates status', async () => {
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([{ id: 'tr1', status: 'approved', transferCode: 'TF1' }]));
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([]));
      mockDb.update.mockReturnValue(makeQueryBuilder([{ id: 'tr1', status: 'shipped' }]));
      expect((await service.ship('t1', 'u1', 'tr1', [{ itemId: 'i1', quantityShipped: 5 }])).status).toBe('shipped');
    });

    it('receive updates status', async () => {
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([{ id: 'tr1', status: 'shipped', transferCode: 'TF1' }]));
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([]));
      mockDb.update.mockReturnValue(makeQueryBuilder([{ id: 'tr1', status: 'received' }]));
      expect((await service.receive('t1', 'u1', 'tr1', [{ itemId: 'i1', quantityReceived: 5 }])).status).toBe('received');
    });

    it('cancel updates status', async () => {
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([{ id: 'tr1', status: 'draft', transferCode: 'TF1' }]));
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([]));
      mockDb.update.mockReturnValue(makeQueryBuilder([{ id: 'tr1', status: 'cancelled' }]));
      expect((await service.cancel('t1', 'u1', 'tr1')).status).toBe('cancelled');
    });
  });

  // ============================================================
  // 8. LotsService — ActivityService DI, direct db
  // ============================================================
  describe('LotsService', () => {
    let service: LotsService;
    let mockActivityService: jest.Mocked<ActivityService>;

    beforeEach(() => {
      mockActivityService = { log: jest.fn().mockResolvedValue({}) } as any;
      service = new LotsService(mockActivityService as any);
    });

    it('create inserts a lot', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([]));
      mockDb.insert.mockReturnValue(makeQueryBuilder([{ id: 'l1', lotNumber: 'LOT-001', quantity: 100 }]));
      const result = await service.create('t1', 'u1', { lotNumber: 'LOT-001', quantity: 100, productId: 'p1' });
      expect(result).toEqual({ id: 'l1', lotNumber: 'LOT-001', quantity: 100 });
    });

    it('create throws on duplicate', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'existing' }]));
      await expect(service.create('t1', 'u1', { lotNumber: 'LOT-001' })).rejects.toThrow('Lot number already exists');
    });

    it('findAll returns lots', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'l1' }]));
      expect(await service.findAll('t1', {})).toEqual([{ id: 'l1' }]);
    });

    it('findOne returns a lot', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'l1' }]));
      expect(await service.findOne('t1', 'l1')).toEqual({ id: 'l1' });
    });

    it('update modifies a lot', async () => {
      mockDb.update.mockReturnValue(makeQueryBuilder([{ id: 'l1', lotNumber: 'LOT-001' }]));
      expect(await service.update('t1', 'u1', 'l1', { quantity: 200 })).toEqual({ id: 'l1', lotNumber: 'LOT-001' });
    });

    it('remove deletes a lot', async () => {
      mockDb.delete.mockReturnValue(makeQueryBuilder([{ id: 'l1' }]));
      expect(await service.remove('t1', 'u1', 'l1')).toEqual({ id: 'l1' });
    });

    it('getExpiringSoon returns expiring lots', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'l1', expiryDate: '2026-07-01' }]));
      expect(await service.getExpiringSoon('t1')).toEqual([{ id: 'l1', expiryDate: '2026-07-01' }]);
    });
  });

  // ============================================================
  // 9. CustomerPortalService — direct db
  // ============================================================
  describe('CustomerPortalService', () => {
    let service: CustomerPortalService;

    beforeEach(() => {
      service = new CustomerPortalService();
    });

    it('getOrders returns orders', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'o1', code: 'ORD-001' }]));
      expect(await service.getOrders('t1', 'c1')).toEqual([{ id: 'o1', code: 'ORD-001' }]);
    });

    it('getTickets returns tickets', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 't1', ticketNumber: 'TKT-001' }]));
      expect(await service.getTickets('t1', 'c1')).toEqual([{ id: 't1', ticketNumber: 'TKT-001' }]);
    });

    it('createTicket inserts ticket', async () => {
      mockDb.insert.mockReturnValue(makeQueryBuilder([{ id: 't1', ticketNumber: 'TKT-ABC', status: 'open' }]));
      expect((await service.createTicket('t1', 'c1', { subject: 'Help' })).status).toBe('open');
    });

    it('getOrderTracking returns tracking steps', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'o1', orderCode: 'ORD-001', status: 'shipping', createdAt: new Date() }]));
      const result = await service.getOrderTracking('t1', 'o1');
      expect(result.steps).toHaveLength(4);
    });

    it('getInvoices returns invoices', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'i1' }]));
      expect(await service.getInvoices('t1', 'c1')).toEqual([{ id: 'i1' }]);
    });
  });

  // ============================================================
  // 10. SupplierPortalService — direct db
  // ============================================================
  describe('SupplierPortalService', () => {
    let service: SupplierPortalService;

    beforeEach(() => {
      service = new SupplierPortalService();
    });

    it('getPurchaseOrders returns POs', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'po1', code: 'PO-001' }]));
      expect(await service.getPurchaseOrders('t1', 's1')).toEqual([{ id: 'po1', code: 'PO-001' }]);
    });

    it('confirmShipment updates PO and creates task', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'po1', supplierId: 's1' }]));
      mockDb.update.mockReturnValue(makeQueryBuilder([]));
      mockDb.insert.mockReturnValue(makeQueryBuilder([]));
      const result = await service.confirmShipment('t1', 's1', 'po1', { deliveryDate: '2026-07-01' });
      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('submitQuotation succeeds', async () => {
      expect((await service.submitQuotation('t1', 's1', 'rfq1', { amount: 1000 })).success).toBe(true);
    });
  });

  // ============================================================
  // 11. SupplierCollaborationService — DrizzleService DI
  // ============================================================
  describe('SupplierCollaborationService', () => {
    let service: SupplierCollaborationService;

    beforeEach(() => {
      service = new SupplierCollaborationService(mockDrizzleService as any);
    });

    it('getSupplierOrders returns orders', async () => {
      const calls: any[] = [];
      mockDb.select
        .mockImplementationOnce(() => makeQueryBuilder([{ id: 's1', tenantId: 't1' }]))
        .mockImplementationOnce(() => makeQueryBuilder([{ id: 'po1', code: 'PO-001' }]));
      const result = await service.getSupplierOrders('s1', 't1');
      expect(result).toEqual([{ id: 'po1', code: 'PO-001' }]);
    });

    it('getSupplierPerformance returns metrics', async () => {
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([{ id: 's1', name: 'Supplier A', tenantId: 't1' }]));
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([
        { id: 'po1', status: 'received', total: '1000' },
        { id: 'po2', status: 'received', total: '2000' },
        { id: 'po3', status: 'pending', total: '500' },
      ]));
      const result = await service.getSupplierPerformance('s1', 't1');
      expect(result).toBeDefined();
      expect(result!.totalOrders).toBe(3);
      expect(result!.totalAmount).toBe(3500);
    });

    it('confirmDelivery updates PO status', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'po1', supplierId: 's1', tenantId: 't1' }]));
      mockDb.update.mockReturnValue(makeQueryBuilder([]));
      mockDb.insert.mockReturnValue(makeQueryBuilder([]));
      expect((await service.confirmDelivery('s1', 'po1', 't1')).status).toBe('in_transit');
    });
  });

  // ============================================================
  // 12. WarehouseMetricsService — DrizzleService DI
  // ============================================================
  describe('WarehouseMetricsService', () => {
    let service: WarehouseMetricsService;

    beforeEach(() => {
      service = new WarehouseMetricsService(mockDrizzleService as any);
    });

    it('getWarehouseStats returns stats', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'w1', name: 'Warehouse A' }]));
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([{ id: 'w1', name: 'Warehouse A' }]));
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([{ count: 42 }]));
      mockDb.execute.mockResolvedValue([{ count: 3 }]);
      const result = await service.getWarehouseStats('t1', 'w1');
      expect(result).toBeDefined();
      expect(result!.warehouseName).toBe('Warehouse A');
      expect(result!.totalProducts).toBe(42);
    });

    it('getAllWarehouseMetrics aggregates', async () => {
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([{ id: 'w1', tenantId: 't1' }, { id: 'w2', tenantId: 't1' }]));
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([{ id: 'w1', name: 'WH1' }]));
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([{ count: 10 }]));
      mockDb.execute.mockResolvedValue([{ count: 1 }]);
      const result = await service.getAllWarehouseMetrics('t1');
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================
  // 13. ExchangeRateService — ConfigService + HttpService + Drizzle
  // ============================================================
  describe('ExchangeRateService', () => {
    let service: ExchangeRateService;
    let mockConfig: jest.Mocked<ConfigService>;
    let mockHttp: jest.Mocked<HttpService>;

    beforeEach(() => {
      mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'EXCHANGE_RATE_API_KEY') return 'test-key';
          if (key === 'EXCHANGE_RATE_API_URL') return 'https://api.example.com/v6/latest';
          return undefined;
        }),
      } as any;
      mockHttp = { get: jest.fn() } as any;
      service = new ExchangeRateService(mockConfig as any, mockHttp as any, mockDrizzleService as any);
    });

    it('fetchRate returns 1 for same currency', async () => {
      const result = await service.fetchRate('USD', 'USD');
      expect(result.rate).toBe(1);
      expect(result.source).toBe('internal');
    });

    it('fetchRate fetches from API when not cached', async () => {
      mockDb.execute.mockReturnValue([]);
      mockHttp.get.mockReturnValue(of({ data: { rates: { VND: 25400 } } } as any));
      const result = await service.fetchRate('USD', 'VND');
      expect(result.rate).toBe(25400);
      expect(result.source).toBe('openexchangerates');
    });

    it('fetchRate uses cached rate when recent', async () => {
      mockDb.execute.mockReturnValue([
        {
          from_currency: 'USD',
          to_currency: 'VND',
          rate: '25000',
          source: 'openexchangerates',
          fetched_at: new Date().toISOString(),
        },
      ]);
      const result = await service.fetchRate('USD', 'VND');
      expect(result.rate).toBe(25000);
    });

    it('fetchRate fallbacks on API error', async () => {
      mockDb.execute.mockReturnValueOnce([]);
      mockHttp.get.mockReturnValue(throwError(() => new Error('Network error')));
      mockDb.execute.mockReturnValueOnce([]);
      const result = await service.fetchRate('USD', 'VND');
      expect(result.rate).toBe(1);
      expect(result.source).toBe('fallback');
    });

    it('convert converts amount', async () => {
      mockDb.execute.mockReturnValue([]);
      mockHttp.get.mockReturnValue(of({ data: { rates: { VND: 25000 } } } as any));
      const result = await service.convert(100, 'USD', 'VND', 't1');
      expect(result.convertedAmount).toBe(2500000);
      expect(result.rate).toBe(25000);
    });

    it('getSupportedCurrencies returns list', () => {
      expect(service.getSupportedCurrencies()).toHaveLength(10);
    });
  });

  // ============================================================
  // 14. NextBestActionService — direct db
  // ============================================================
  describe('NextBestActionService', () => {
    let service: NextBestActionService;

    beforeEach(() => {
      service = new NextBestActionService();
    });

    it('getNextBestAction returns action for lead', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'lead1', source: 'referral', industry: 'manufacturing' }]));
      mockDb.execute.mockResolvedValue({ rows: [{ email_opens: 5, email_clicks: 2, website_visits: 10, days_since_last_contact: 20 }] });
      const result = await service.getNextBestAction('lead1', 't1');
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('priority');
    });

    it('getNextBestAction throws for missing lead', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([]));
      await expect(service.getNextBestAction('missing', 't1')).rejects.toThrow('Lead not found');
    });
  });

  // ============================================================
  // 15. JournalEntriesService — direct db
  // ============================================================
  describe('JournalEntriesService', () => {
    let service: JournalEntriesService;

    beforeEach(() => {
      service = new JournalEntriesService();
    });

    it('create inserts balanced journal entry', async () => {
      jest.spyOn(service, 'findOne' as any).mockResolvedValue({
        id: 'je1', voucherNumber: 'BC2026000001',
        lines: [], totalDebit: 0, totalCredit: 0,
      });
      mockDb.select.mockReturnValue(makeQueryBuilder([]));
      mockDb.insert.mockReturnValue(makeQueryBuilder([]));
      const dto = {
        voucherDate: '2026-06-26', description: 'Test',
        lines: [{ accountId: 'a1', debit: 100, credit: 0 }, { accountId: 'a2', debit: 0, credit: 100 }],
      };
      const result = await service.create('t1', 'u1', dto as any);
      expect(result).toBeDefined();
    });

    it('create throws for unbalanced entry', async () => {
      const dto = {
        voucherDate: '2026-06-26', description: 'Bad',
        lines: [{ accountId: 'a1', debit: 100, credit: 0 }, { accountId: 'a2', debit: 0, credit: 50 }],
      };
      await expect(service.create('t1', 'u1', dto as any)).rejects.toThrow('Journal entry must be balanced');
    });

    it('findAll returns entries with filters', async () => {
      mockDb.select.mockReturnValue(makeQueryBuilder([{ id: 'je1' }]));
      const result = await service.findAll('t1', { isPosted: true });
      expect(result.items).toEqual([{ id: 'je1' }]);
    });

    it('findOne returns entry with lines', async () => {
      const entryQb = makeQueryBuilder([{ id: 'je1' }]);
      entryQb.limit = jest.fn().mockReturnValue(entryQb);
      mockDb.select.mockReturnValue(entryQb);
      const linesQb = makeQueryBuilder([{ id: 'l1', debit: '100', credit: '0' }]);
      linesQb.where = jest.fn().mockReturnValue(linesQb);
      linesQb.leftJoin = jest.fn().mockReturnValue(linesQb);
      linesQb.orderBy = jest.fn().mockReturnValue(linesQb);
      const result = await service.findOne('t1', 'je1');
      expect(result).toHaveProperty('lines');
    });

    it('post marks entry as posted', async () => {
      jest.spyOn(service, 'findOne' as any).mockResolvedValue({ id: 'je1', isPosted: false, lines: [] });
      mockDb.update.mockReturnValue(makeQueryBuilder([]));
      expect((await service.post('t1', 'u1', 'je1')).success).toBe(true);
    });

    it('reverse creates reverse entry', async () => {
      jest.spyOn(service, 'findOne' as any).mockResolvedValue({
        id: 'je1', isPosted: true, voucherNumber: 'BC2026000001', totalAmount: '100',
        lines: [{ accountId: 'a1', debit: '100', credit: '0', description: 'Line 1' }],
      });
      mockDb.select.mockReturnValue(makeQueryBuilder([]));
      mockDb.insert.mockReturnValue(makeQueryBuilder([]));
      const result = await service.reverse('t1', 'u1', 'je1');
      expect(result.success).toBe(true);
    });

    it('getTrialBalance returns balances', async () => {
      mockDb.select.mockReturnValueOnce(makeQueryBuilder([{ id: 'je1' }]));
      const linesQb = makeQueryBuilder([{ accountId: 'a1', accountCode: '1000', debit: '100', credit: '0' }]);
      linesQb.where = jest.fn().mockReturnValue(linesQb);
      linesQb.leftJoin = jest.fn().mockReturnValue(linesQb);
      const result = await service.getTrialBalance('t1');
      expect(result).toHaveProperty('isBalanced');
    });
  });

  // ============================================================
  // 16. NotificationService — ConfigService + DrizzleService DI
  // ============================================================
  describe('NotificationService', () => {
    let service: NotificationService;
    let mockConfig: jest.Mocked<ConfigService>;

    beforeEach(() => {
      mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'EMAIL_API_KEY') return undefined;
          if (key === 'SMS_API_KEY') return undefined;
          if (key === 'EMAIL_PROVIDER') return 'sendgrid';
          if (key === 'EMAIL_FROM') return 'noreply@test.com';
          return undefined;
        }),
      } as any;
      service = new NotificationService(mockConfig as any, mockDrizzleService as any);
    });

    it('send sends email notification', async () => {
      mockDb.execute.mockResolvedValue([]);
      const result = await service.send('t1', {
        recipientId: 'u1', recipientEmail: 'test@test.com', channel: 'email', body: 'Hello', subject: 'Test',
      });
      expect(result.success).toBe(true);
    });

    it('send resolves template variables', async () => {
      mockDb.execute.mockResolvedValue([]);
      const result = await service.send('t1', {
        recipientId: 'u1', recipientEmail: 'test@test.com', channel: 'email',
        templateName: 'welcome', body: '', subject: '', variables: { userName: 'John' },
      });
      expect(result.success).toBe(true);
    });

    it('sendBulk returns sent/failed counts', async () => {
      mockDb.execute.mockResolvedValue([]);
      const result = await service.sendBulk('t1', [
        { recipientId: 'u1', recipientEmail: 'a@b.com', channel: 'email', body: 'A', subject: 'S1' },
        { recipientId: 'u2', recipientEmail: 'c@d.com', channel: 'email', body: 'B', subject: 'S2' },
      ]);
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('getHistory returns logs', async () => {
      mockDb.execute.mockResolvedValue([{ id: 'n1' }]);
      expect(await service.getHistory('t1')).toBeDefined();
    });

    it('getTemplates returns templates', () => {
      expect(service.getTemplates()).toHaveLength(5);
    });

    it('createTemplate returns new template', async () => {
      const result = await service.createTemplate('t1', { name: 'Custom', channel: 'email', body: 'Body', variables: [] });
      expect(result.name).toBe('Custom');
    });
  });

  // ============================================================
  // 17. HealthMonitorService — ConfigService + DrizzleService DI
  // ============================================================
  describe('HealthMonitorService', () => {
    let service: HealthMonitorService;
    let mockConfig: jest.Mocked<ConfigService>;

    beforeEach(() => {
      mockConfig = { get: jest.fn() } as any;
      service = new HealthMonitorService(mockConfig as any, mockDrizzleService as any);
    });

    it('getHealth returns overall health', async () => {
      mockDb.execute.mockResolvedValue([]);
      const result = await service.getHealth();
      expect(result).toHaveProperty('status');
      expect(result.services.api.status).toBe('up');
    });

    it('getHealth detects database issues', async () => {
      mockDb.execute.mockRejectedValue(new Error('Connection failed'));
      const result = await service.getHealth();
      expect(result.services.database.status).toBe('down');
      expect(result.status).toBe('down');
    });

    it('recordRequest tracks metrics', async () => {
      service.recordRequest(50, false);
      service.recordRequest(200, true);
      service.recordRequest(100, false);
      mockDb.execute.mockResolvedValue([]);
      const health = await service.getHealth();
      expect(health.metrics.requestsPerMinute).toBe(3);
    });
  });

  // ============================================================
  // 18. DrizzleService — no constructor, infrastructure
  // ============================================================
  describe('DrizzleService', () => {
    it('exposes db property', () => {
      const service = new DrizzleService();
      expect(service.db).toBeDefined();
    });

    it('onModuleInit skips seed when data exists', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        then: jest.fn((cb: any) => Promise.resolve(cb([{ count: 5 }]))),
      });
      const service = new DrizzleService();
      await service.onModuleInit();
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 19. ChatbotService — ConfigService DI, in-memory
  // ============================================================
  describe('ChatbotService', () => {
    let service: ChatbotService;
    let mockConfig: jest.Mocked<ConfigService>;

    beforeEach(() => {
      mockConfig = { get: jest.fn().mockReturnValue(undefined) } as any;
      service = new ChatbotService(mockConfig as any);
    });

    it('chat responds to greeting', async () => {
      const result = await service.chat('t1', 'u1', 'Xin chào');
      expect(result.intent).toBe('greeting');
      expect(result.message).toContain('Hello');
    });

    it('chat responds to order status inquiry', async () => {
      const result = await service.chat('t1', 'u1', 'Trạng thái đơn hàng');
      expect(result.intent).toBe('order_status');
    });

    it('chat extracts order code', async () => {
      const result = await service.chat('t1', 'u1', 'Check order ORD-123');
      expect(result.intent).toBe('order_status');
      expect(result.entities?.orderCode).toBe('ORD-123');
    });

    it('chat responds to product inquiry', async () => {
      const result = await service.chat('t1', 'u1', 'Sản phẩm mới');
      expect(result.intent).toBe('product_inquiry');
    });

    it('chat responds to payment help', async () => {
      const result = await service.chat('t1', 'u1', 'Thanh toán hóa đơn');
      expect(result.intent).toBe('payment_help');
    });

    it('chat responds to account help', async () => {
      const result = await service.chat('t1', 'u1', 'Tài khoản đăng nhập');
      expect(result.intent).toBe('account_help');
    });

    it('chat fallbacks to general', async () => {
      const result = await service.chat('t1', 'u1', 'What is the meaning of life?');
      expect(result.intent).toBe('general');
    });

    it('getHistory returns chat history', async () => {
      await service.chat('t1', 'u1', 'Xin chào');
      expect(service.getHistory('t1', 'u1')).toHaveLength(2);
    });

    it('clearHistory clears session', async () => {
      await service.chat('t1', 'u1', 'Xin chào');
      service.clearHistory('t1', 'u1');
      expect(service.getHistory('t1', 'u1')).toEqual([]);
    });
  });
});
