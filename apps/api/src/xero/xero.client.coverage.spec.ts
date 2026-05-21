const mockAxios = {
  post: jest.fn(),
  request: jest.fn(),
};

jest.mock('axios', () => ({
  __esModule: true,
  default: mockAxios,
  post: mockAxios.post,
  request: mockAxios.request,
}));

import { XeroClient } from './xero.client';

describe('XeroClient coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reuses valid access tokens for organisation and customer reads', async () => {
    const client = new XeroClient({
      clientId: 'client',
      clientSecret: 'secret',
      refreshToken: 'refresh',
      tenantId: 'xero-tenant',
      accessToken: 'token',
      accessTokenExpiry: 1770000001000,
    });
    mockAxios.request
      .mockResolvedValueOnce({ data: { Organisations: [{ id: 'org-1' }] } })
      .mockResolvedValueOnce({ data: { Contacts: [{ ContactID: 'contact-1' }] } });

    await expect(client.getOrganisations()).resolves.toEqual({ id: 'org-1' });
    await expect(client.getCustomers(2, 25)).resolves.toEqual([{ ContactID: 'contact-1' }]);
    expect(mockAxios.post).not.toHaveBeenCalled();
    expect(mockAxios.request).toHaveBeenNthCalledWith(2, expect.objectContaining({
      method: 'GET',
      url: 'https://api.xero.com/api.xro/2.0/Contacts?page=2&pageSize=25',
      headers: expect.objectContaining({ 'Xero-tenant-id': 'xero-tenant' }),
    }));
  });

  it('refreshes expired tokens and returns empty arrays for missing API collections', async () => {
    const client = new XeroClient({
      clientId: 'client',
      clientSecret: 'secret',
      refreshToken: 'refresh',
      tenantId: 'xero-tenant',
      accessToken: 'old',
      accessTokenExpiry: 1,
    });
    mockAxios.post.mockResolvedValueOnce({ data: { access_token: 'new-token', expires_in: 3600 } });
    mockAxios.request
      .mockResolvedValueOnce({ data: { Invoices: [{ InvoiceID: 'invoice-1' }] } })
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ data: {} });

    await expect(client.getInvoices(new Date('2026-05-20T00:00:00.000Z'), 1, 10)).resolves.toEqual([{ InvoiceID: 'invoice-1' }]);
    await expect(client.getPayments()).resolves.toEqual([]);
    await expect(client.getOrganisations()).resolves.toBeNull();
    expect(mockAxios.post).toHaveBeenCalledWith('https://identity.xero.com/connect/token', expect.any(URLSearchParams), expect.any(Object));
  });

  it('covers default pagination, modified payment filters, and refresh without an expiry', async () => {
    const client = new XeroClient({
      clientId: 'client',
      clientSecret: 'secret',
      refreshToken: 'refresh',
      tenantId: 'xero-tenant',
      accessToken: 'old-token',
    });
    mockAxios.post.mockResolvedValueOnce({ data: { access_token: 'fresh-token', expires_in: 60 } });
    mockAxios.request
      .mockResolvedValueOnce({ data: { Contacts: undefined } })
      .mockResolvedValueOnce({ data: { Invoices: undefined } })
      .mockResolvedValueOnce({ data: { Payments: [{ PaymentID: 'payment-1' }] } });

    await expect(client.getCustomers()).resolves.toEqual([]);
    await expect(client.getInvoices()).resolves.toEqual([]);
    await expect(client.getPayments(new Date('2026-05-21T00:00:00.000Z'), 3, 15)).resolves.toEqual([{ PaymentID: 'payment-1' }]);

    expect(mockAxios.request).toHaveBeenNthCalledWith(3, expect.objectContaining({
      url: 'https://api.xero.com/api.xro/2.0/Payments?page=3&pageSize=15&modifiedAfter=2026-05-21T00:00:00.000Z',
    }));
  });
});
