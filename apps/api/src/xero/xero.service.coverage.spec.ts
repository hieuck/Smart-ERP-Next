const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

const mockClient = {
  getCustomers: jest.fn(),
  getInvoices: jest.fn(),
};

const mockXeroClient = jest.fn(() => mockClient);

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  xeroConnections: { tenantId: 'xeroConnections.tenantId', id: 'xeroConnections.id' },
  xeroSyncLogs: {},
  customers: { tenantId: 'customers.tenantId', externalId: 'customers.externalId', id: 'customers.id' },
  orders: { tenantId: 'orders.tenantId', externalId: 'orders.externalId', id: 'orders.id' },
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
}));

jest.mock('./xero.client', () => ({
  XeroClient: mockXeroClient,
}));

import { XeroService } from './xero.service';

const selectQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeWriteChain = () => {
  const chain: any = {
    values: jest.fn(() => chain),
    set: jest.fn(() => chain),
    where: jest.fn(() => Promise.resolve(undefined)),
  };
  return chain;
};

describe('XeroService coverage', () => {
  let service: XeroService;

  beforeEach(() => {
    jest.clearAllMocks();
    selectQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeWriteChain());
    mockDb.update.mockImplementation(() => makeWriteChain());
    service = new XeroService();
  });

  it('gets and saves tenant Xero connections', async () => {
    selectQueue.push([{ id: 'conn-1', tenantId: 'tenant-1' }], [{ id: 'conn-1' }], []);

    await expect(service.getConnection('tenant-1')).resolves.toEqual({ id: 'conn-1', tenantId: 'tenant-1' });
    await expect(service.saveConnection('tenant-1', { refreshToken: 'new' })).resolves.toBeUndefined();
    await expect(service.saveConnection('tenant-1', { refreshToken: 'first' })).resolves.toBeUndefined();

    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });

  it('syncs Xero customers into existing or new ERP customers', async () => {
    mockClient.getCustomers.mockResolvedValueOnce([
      { ContactID: 'c1', ContactNumber: 'C-1', Name: 'ACME', EmailAddress: 'a@test.com', PhoneNumber: '090', Addresses: [{ AddressLine1: 'HCM' }] },
      { ContactID: 'c2' },
    ]);
    selectQueue.push([{ id: 'customer-1' }], []);

    await service.syncCustomers('store-1', {
      tenantId: 'tenant-1',
      clientId: 'client',
      clientSecret: 'secret',
      refreshToken: 'refresh',
      xeroTenantId: 'xero-tenant',
    });

    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(mockDb.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      externalId: 'c2',
      externalPlatform: 'xero',
    }));
  });

  it('syncs Xero invoices and maps statuses to ERP order states', async () => {
    mockClient.getInvoices.mockResolvedValueOnce([
      { InvoiceID: 'i1', InvoiceNumber: 'INV-1', Status: 'PAID', Total: '1200', Contact: { Name: 'ACME' }, Date: '2026-05-20' },
      { InvoiceID: 'i2', InvoiceNumber: 'INV-2', Status: 'UNKNOWN', Total: '0', Date: '2026-05-21' },
    ]);
    selectQueue.push([{ id: 'order-1' }], []);

    await service.syncInvoices('store-1', {
      tenantId: 'tenant-1',
      clientId: 'client',
      clientSecret: 'secret',
      refreshToken: 'refresh',
      xeroTenantId: 'xero-tenant',
      lastSyncAt: '2026-05-01T00:00:00.000Z',
    });

    expect(mockDb.update.mock.results[0].value.set).toHaveBeenCalledWith(expect.objectContaining({
      status: 'delivered',
      externalId: 'i1',
    }));
    expect(mockDb.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      status: 'pending',
      externalId: 'i2',
    }));

    mockClient.getInvoices.mockResolvedValueOnce([
      { InvoiceID: 'i3', InvoiceNumber: 'INV-3', Status: 'AUTHORISED' },
    ]);
    selectQueue.push([]);
    await service.syncInvoices('store-1', {
      tenantId: 'tenant-1',
      clientId: 'client',
      clientSecret: 'secret',
      refreshToken: 'refresh',
      xeroTenantId: 'xero-tenant',
    });
    expect(mockClient.getInvoices).toHaveBeenLastCalledWith(undefined, 1, 100);
    expect(mockDb.insert.mock.results[1].value.values).toHaveBeenCalledWith(expect.objectContaining({
      customerName: 'Xero Customer',
      total: '0',
      status: 'confirmed',
    }));
  });
});
