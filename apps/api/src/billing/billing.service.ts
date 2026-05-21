import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  limits: {
    users: number;
    products: number;
    orders: number;
    storage: number; // MB
  };
  isActive: boolean;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  planName: string;
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  usage: {
    users: number;
    products: number;
    orders: number;
    storage: number;
  };
}

export interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  paidAt?: string;
  items: { description: string; quantity: number; unitPrice: number; amount: number }[];
  createdAt: string;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  private readonly plans: SubscriptionPlan[] = [
    {
      id: 'plan-free',
      name: 'Free',
      description: 'Perfect for small businesses getting started',
      price: 0,
      currency: 'VND',
      interval: 'monthly',
      features: ['Up to 3 users', '100 products', '500 orders/month', 'Basic reports'],
      limits: { users: 3, products: 100, orders: 500, storage: 500 },
      isActive: true,
    },
    {
      id: 'plan-starter',
      name: 'Starter',
      description: 'For growing businesses',
      price: 499000,
      currency: 'VND',
      interval: 'monthly',
      features: ['Up to 10 users', '1,000 products', '5,000 orders/month', 'Advanced reports', 'API access'],
      limits: { users: 10, products: 1000, orders: 5000, storage: 2000 },
      isActive: true,
    },
    {
      id: 'plan-professional',
      name: 'Professional',
      description: 'For established businesses',
      price: 1499000,
      currency: 'VND',
      interval: 'monthly',
      features: ['Up to 50 users', '10,000 products', 'Unlimited orders', 'All reports', 'API access', 'Priority support'],
      limits: { users: 50, products: 10000, orders: -1, storage: 10000 },
      isActive: true,
    },
    {
      id: 'plan-enterprise',
      name: 'Enterprise',
      description: 'For large organizations',
      price: 4999000,
      currency: 'VND',
      interval: 'monthly',
      features: ['Unlimited users', 'Unlimited products', 'Unlimited orders', 'All features', 'Dedicated support', 'Custom integrations'],
      limits: { users: -1, products: -1, orders: -1, storage: 100000 },
      isActive: true,
    },
  ];

  constructor(private readonly drizzle: DrizzleService) {}

  /** Get all available plans */
  getPlans(): SubscriptionPlan[] {
    return this.plans.filter((p) => p.isActive);
  }

  /** Get plan by ID */
  getPlan(planId: string): SubscriptionPlan | undefined {
    return this.plans.find((p) => p.id === planId);
  }

  /** Get tenant's current subscription */
  async getSubscription(tenantId: string): Promise<Subscription> {
    const result = await this.drizzle.db.execute(
      sql`
        SELECT s.*, p.name as plan_name
        FROM subscriptions s
        JOIN plans p ON p.id = s.plan_id
        WHERE s.tenant_id = ${tenantId}
        ORDER BY s.created_at DESC
        LIMIT 1
      `,
    );
    const rows = result.rows;
    if (rows.length) {
      const row = rows[0];
      // Map the result to Subscription shape
      return {
        id: row.id,
        tenantId: row.tenant_id,
        planId: row.plan_id,
        planName: row.plan_name,
        status: row.status as Subscription['status'],
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        usage: {
          users: row.usage_users,
          products: row.usage_products,
          orders: row.usage_orders,
          storage: row.usage_storage,
        },
      } as Subscription;
    }

    // Default to free plan
    const freePlan = this.plans.find((p) => p.id === 'plan-free')!;
    return {
      id: 'sub-default',
      tenantId,
      planId: freePlan.id,
      planName: freePlan.name,
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      usage: { users: 1, products: 0, orders: 0, storage: 0 },
    };
  }

  /** Subscribe tenant to a plan */
  async subscribe(tenantId: string, planId: string): Promise<Subscription> {
    const plan = this.getPlan(planId);
    if (!plan) throw new Error('Plan not found');

    const id = crypto.randomUUID();
    const now = new Date();
    const periodEnd = new Date(now.getTime() + (plan.interval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

    await this.drizzle.db.execute(
      sql`
        INSERT INTO subscriptions (id, tenant_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at)
        VALUES (${id}, ${tenantId}, ${planId}, 'active', ${now.toISOString()}, ${periodEnd.toISOString()}, NOW(), NOW())
      `,
    );

    return this.getSubscription(tenantId);
  }

  /** Cancel subscription */
  async cancelSubscription(tenantId: string): Promise<void> {
    await this.drizzle.db.execute(
      sql`UPDATE subscriptions SET cancel_at_period_end = true, updated_at = NOW() WHERE tenant_id = ${tenantId} AND status = 'active'`
    );
  }

  /** Generate invoice for a subscription period */
  async generateInvoice(tenantId: string, planId: string): Promise<Invoice> {
    const plan = this.getPlan(planId);
    if (!plan) throw new Error('Plan not found');

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const result = await this.drizzle.db.execute(
      sql`
        INSERT INTO invoices (id, tenant_id, invoice_number, amount, currency, status, due_date, items, created_at)
        VALUES (
          gen_random_uuid(), ${tenantId}, ${invoiceNumber}, ${plan.price}, ${plan.currency}, 'sent',
          ${dueDate.toISOString()},
          ${JSON.stringify([{ description: `${plan.name} Plan - ${plan.interval}`, quantity: 1, unitPrice: plan.price, amount: plan.price }])}::jsonb,
          NOW()
        ) RETURNING *
      `,
    );

    const invoice = result.rows[0];
    return (invoice as any) as Invoice;
  }

  /** Get invoice history */
  async getInvoices(tenantId: string, limit = 20): Promise<Invoice[]> {
    const result = await this.drizzle.db.execute(
      sql`SELECT * FROM invoices WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit}`
    );
    return result.rows as any as Invoice[];
  }

  /** Record usage for a tenant */
  async recordUsage(tenantId: string, metric: 'users' | 'products' | 'orders' | 'storage', value: number): Promise<void> {
    await this.drizzle.db.execute(
      sql`
        INSERT INTO usage_records (id, tenant_id, metric, value, recorded_at)
        VALUES (gen_random_uuid(), ${tenantId}, ${metric}, ${value}, NOW())
      `,
    );
  }

  /** Check if tenant has exceeded plan limits */
  async checkLimits(tenantId: string): Promise<{ exceeded: boolean; violations: string[] }> {
    const subscription = await this.getSubscription(tenantId);
    const plan = this.getPlan(subscription.planId);
    const violations: string[] = [];

    if (!plan) return { exceeded: true, violations: ['No active plan'] };

    // Get current usage
    const usage = await this.drizzle.db.execute(
      sql`
        SELECT
          (SELECT count(*) FROM users WHERE tenant_id = ${tenantId} AND is_active = true) as users,
          (SELECT count(*) FROM products WHERE tenant_id = ${tenantId} AND is_active = true) as products,
          (SELECT count(*) FROM orders WHERE tenant_id = ${tenantId} AND created_at >= ${subscription.currentPeriodStart}) as orders
      `,
    );

    const current = (usage.rows as any[])[0];

    if (plan.limits.users > 0 && current.users >= plan.limits.users) {
      violations.push(`User limit exceeded: ${current.users}/${plan.limits.users}`);
    }
    if (plan.limits.products > 0 && current.products >= plan.limits.products) {
      violations.push(`Product limit exceeded: ${current.products}/${plan.limits.products}`);
    }
    if (plan.limits.orders > 0 && current.orders >= plan.limits.orders) {
      violations.push(`Order limit exceeded: ${current.orders}/${plan.limits.orders}`);
    }

    return { exceeded: violations.length > 0, violations };
  }
}
