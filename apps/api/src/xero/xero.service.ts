import { Injectable } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { xeroConnections, xeroSyncLogs } from '@smart-erp/database/schema';
import { eq, and, sql } from '@smart-erp/database/drizzle';
import { XeroClient } from './xero.client';
import { customers, orders } from '@smart-erp/database/schema';

@Injectable()
export class XeroService {
  async getConnection(tenantId: string) {
    const conn = await db.select().from(xeroConnections).where(eq(xeroConnections.tenantId, tenantId)).then(r => r[0]);
    return conn;
  }

  async saveConnection(tenantId: string, data: any) {
    const existing = await this.getConnection(tenantId);
    if (existing) {
      await db.update(xeroConnections).set(data).where(eq(xeroConnections.id, existing.id));
    } else {
      await db.insert(xeroConnections).values({ ...data, tenantId });
    }
  }

  async syncCustomers(storeId: string, conn: any) {
    const client = new XeroClient({
      clientId: conn.clientId,
      clientSecret: conn.clientSecret,
      refreshToken: conn.refreshToken,
      tenantId: conn.xeroTenantId,
    });
    const xeroCustomers = await client.getCustomers(1, 100);
    for (const xc of xeroCustomers) {
      await this.upsertCustomerFromXero(conn.tenantId, xc);
    }
  }

  private async upsertCustomerFromXero(tenantId: string, xeroCustomer: any) {
    const externalId = xeroCustomer.ContactID;
    const existing = await db.select().from(customers).where(and(eq(customers.tenantId, tenantId), eq(customers.externalId, externalId))).then(r => r[0]);
    const customerData = {
      name: xeroCustomer.Name || xeroCustomer.ContactNumber || 'Unknown',
      email: xeroCustomer.EmailAddress || '',
      phone: xeroCustomer.PhoneNumber || '',
      address: xeroCustomer.Addresses?.[0]?.AddressLine1 || '',
      externalId,
      externalPlatform: 'xero',
    };
    if (existing) {
      await db.update(customers).set(customerData).where(eq(customers.id, existing.id));
    } else {
      await db.insert(customers).values({ ...customerData, tenantId });
    }
  }

  async syncInvoices(storeId: string, conn: any) {
    const client = new XeroClient({
      clientId: conn.clientId,
      clientSecret: conn.clientSecret,
      refreshToken: conn.refreshToken,
      tenantId: conn.xeroTenantId,
    });
    const since = conn.lastSyncAt ? new Date(conn.lastSyncAt) : undefined;
    const xeroInvoices = await client.getInvoices(since, 1, 100);
    for (const xi of xeroInvoices) {
      await this.upsertOrderFromXero(conn.tenantId, xi);
    }
  }

  private async upsertOrderFromXero(tenantId: string, xeroInvoice: any) {
    const externalId = xeroInvoice.InvoiceID;
    const existing = await db.select().from(orders).where(and(eq(orders.tenantId, tenantId), eq(orders.externalId, externalId))).then(r => r[0]);
    const orderData = {
      code: xeroInvoice.InvoiceNumber,
      customerName: xeroInvoice.Contact?.Name || 'Xero Customer',
      total: parseFloat(xeroInvoice.Total || '0'),
      status: this.mapXeroStatus(xeroInvoice.Status),
      channel: 'xero',
      externalId,
      externalPlatform: 'xero',
      orderDate: new Date(xeroInvoice.Date),
    };
    if (existing) {
      await db.update(orders).set(orderData).where(eq(orders.id, existing.id));
    } else {
      await db.insert(orders).values({ ...orderData, tenantId });
    }
  }

  private mapXeroStatus(xeroStatus: string): string {
    const map: Record<string, string> = {
      'DRAFT': 'draft',
      'SUBMITTED': 'pending',
      'AUTHORISED': 'confirmed',
      'PAID': 'delivered',
      'VOIDED': 'cancelled',
    };
    return map[xeroStatus] || 'pending';
  }
}
