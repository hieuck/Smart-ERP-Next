jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

import { BillingService } from './billing.service';

describe('BillingService coverage', () => {
  const db = { execute: jest.fn() };
  let service: BillingService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-20T00:00:00.000Z').getTime());
    service = new BillingService({ db } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns active plans and falls back to the free subscription when none exists', async () => {
    db.execute.mockResolvedValueOnce({ rows: [] });

    expect(service.getPlans().map((plan) => plan.id)).toEqual([
      'plan-free',
      'plan-starter',
      'plan-professional',
      'plan-enterprise',
    ]);
    expect(service.getPlan('plan-starter')?.price).toBe(499000);
    await expect(service.getSubscription('tenant-1')).resolves.toMatchObject({
      id: 'sub-default',
      tenantId: 'tenant-1',
      planId: 'plan-free',
      status: 'active',
      usage: { users: 1, products: 0, orders: 0, storage: 0 },
    });
  });

  it('maps stored subscriptions, subscribes to plans, and rejects unknown plans', async () => {
    db.execute
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'sub-1',
            tenant_id: 'tenant-1',
            plan_id: 'plan-starter',
            plan_name: 'Starter',
            status: 'trial',
            current_period_start: '2026-05-01',
            current_period_end: '2026-06-01',
            cancel_at_period_end: false,
            usage_users: 2,
            usage_products: 50,
            usage_orders: 75,
            usage_storage: 128,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'sub-2',
            tenant_id: 'tenant-1',
            plan_id: 'plan-enterprise',
            plan_name: 'Enterprise',
            status: 'active',
            current_period_start: '2026-05-20',
            current_period_end: '2027-05-20',
            cancel_at_period_end: false,
            usage_users: 1,
            usage_products: 0,
            usage_orders: 0,
            usage_storage: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'sub-3',
            tenant_id: 'tenant-1',
            plan_id: 'plan-starter',
            plan_name: 'Starter',
            status: 'active',
            current_period_start: '2026-05-20',
            current_period_end: '2026-06-19',
            cancel_at_period_end: false,
            usage_users: 1,
            usage_products: 0,
            usage_orders: 0,
            usage_storage: 0,
          },
        ],
      });
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('sub-new');

    await expect(service.getSubscription('tenant-1')).resolves.toMatchObject({
      id: 'sub-1',
      planName: 'Starter',
      usage: { users: 2, products: 50, orders: 75, storage: 128 },
    });
    await expect(service.subscribe('tenant-1', 'plan-enterprise')).resolves.toMatchObject({
      id: 'sub-2',
      planId: 'plan-enterprise',
    });
    await expect(service.subscribe('tenant-1', 'plan-starter')).resolves.toMatchObject({
      id: 'sub-3',
      planId: 'plan-starter',
    });
    await expect(service.subscribe('tenant-1', 'missing')).rejects.toThrow('Plan not found');
  });

  it('supports yearly subscription periods when a yearly plan is configured', async () => {
    (service as any).plans.push({
      id: 'plan-annual',
      name: 'Annual',
      price: 4990000,
      currency: 'VND',
      interval: 'yearly',
      features: [],
      limits: { users: 1, products: 1, orders: 1, storage: 1 },
      isActive: true,
    });
    db.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'sub-annual',
            tenant_id: 'tenant-1',
            plan_id: 'plan-annual',
            plan_name: 'Annual',
            status: 'active',
            current_period_start: '2026-05-20',
            current_period_end: '2027-05-20',
            cancel_at_period_end: false,
            usage_users: 1,
            usage_products: 0,
            usage_orders: 0,
            usage_storage: 0,
          },
        ],
      });
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('sub-annual');

    await expect(service.subscribe('tenant-1', 'plan-annual')).resolves.toMatchObject({
      id: 'sub-annual',
      planId: 'plan-annual',
    });
  });

  it('cancels subscriptions, generates invoices, records usage, and lists invoice history', async () => {
    const invoice = { id: 'invoice-1', invoiceNumber: 'INV-TEST' };
    db.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [invoice] })
      .mockResolvedValueOnce({ rows: [{ id: 'invoice-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'invoice-default' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(service.cancelSubscription('tenant-1')).resolves.toBeUndefined();
    await expect(service.generateInvoice('tenant-1', 'plan-starter')).resolves.toEqual(invoice);
    await expect(service.getInvoices('tenant-1', 10)).resolves.toEqual([{ id: 'invoice-1' }]);
    await expect(service.getInvoices('tenant-1')).resolves.toEqual([{ id: 'invoice-default' }]);
    await expect(service.recordUsage('tenant-1', 'orders', 25)).resolves.toBeUndefined();
    await expect(service.generateInvoice('tenant-1', 'missing')).rejects.toThrow('Plan not found');
  });

  it('checks subscription limits and unlimited plans', async () => {
    jest
      .spyOn(service, 'getSubscription')
      .mockResolvedValueOnce({
        planId: 'plan-free',
        currentPeriodStart: '2026-05-01',
      } as any)
      .mockResolvedValueOnce({ planId: 'plan-enterprise', currentPeriodStart: '2026-05-01' } as any)
      .mockResolvedValueOnce({ planId: 'missing', currentPeriodStart: '2026-05-01' } as any);
    db.execute
      .mockResolvedValueOnce({ rows: [{ users: 3, products: 100, orders: 500 }] })
      .mockResolvedValueOnce({ rows: [{ users: 999, products: 999999, orders: 999999 }] });

    await expect(service.checkLimits('tenant-1')).resolves.toEqual({
      exceeded: true,
      violations: [
        'User limit exceeded: 3/3',
        'Product limit exceeded: 100/100',
        'Order limit exceeded: 500/500',
      ],
    });
    await expect(service.checkLimits('tenant-1')).resolves.toEqual({ exceeded: false, violations: [] });
    await expect(service.checkLimits('tenant-1')).resolves.toEqual({ exceeded: true, violations: ['No active plan'] });
  });
});
