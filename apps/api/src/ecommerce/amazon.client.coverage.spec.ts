const mockHttp = {
  request: jest.fn(),
};

const mockAxios = {
  create: jest.fn(() => mockHttp),
  post: jest.fn(),
};

jest.mock('axios', () => ({
  __esModule: true,
  default: mockAxios,
  create: mockAxios.create,
  post: mockAxios.post,
}));

import { AmazonClient } from './amazon.client';

describe('AmazonClient coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses regional endpoints and existing tokens for catalog/orders', async () => {
    const client = new AmazonClient({
      clientId: 'client',
      clientSecret: 'secret',
      refreshToken: 'refresh',
      sellerId: 'seller',
      region: 'eu',
      accessToken: 'token',
      accessTokenExpiry: 1770000001000,
    });
    mockHttp.request
      .mockResolvedValueOnce({ data: { items: [{ asin: 'A1' }] } })
      .mockResolvedValueOnce({ data: { payload: { Orders: [{ AmazonOrderId: 'O1' }] } } });

    await expect(client.getProducts(2, 25)).resolves.toEqual([{ asin: 'A1' }]);
    await expect(client.getOrders(new Date('2026-05-20T00:00:00.000Z'), 3, 10)).resolves.toEqual([{ AmazonOrderId: 'O1' }]);
    await expect(client.getCustomers()).resolves.toEqual([]);
    expect(mockAxios.create).toHaveBeenCalledWith({ baseURL: 'https://sellingpartnerapi-eu.amazon.com' });
    expect(mockAxios.post).not.toHaveBeenCalled();
  });

  it('refreshes tokens and surfaces Amazon API errors', async () => {
    const client = new AmazonClient({
      clientId: 'client',
      clientSecret: 'secret',
      refreshToken: 'refresh',
      sellerId: 'seller',
      region: 'na',
      accessTokenExpiry: 1,
    });
    mockAxios.post.mockResolvedValueOnce({ data: { access_token: 'new-token', expires_in: 3600 } });
    mockHttp.request.mockResolvedValueOnce({ data: { errors: [{ message: 'bad request' }] } });

    await expect(client.getProducts()).rejects.toThrow('bad request');
    expect(mockAxios.post).toHaveBeenCalledWith('https://api.amazon.com/auth/o2/token', expect.any(URLSearchParams), expect.any(Object));
  });

  it('uses NA endpoint fallback and empty response defaults', async () => {
    const client = new AmazonClient({
      clientId: 'client',
      clientSecret: 'secret',
      refreshToken: 'refresh',
      sellerId: 'seller',
      region: 'unknown' as any,
      accessToken: 'token',
      accessTokenExpiry: 1770000001000,
    });
    mockHttp.request
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ data: { payload: {} } });

    await expect(client.getProducts()).resolves.toEqual([]);
    await expect(client.getOrders()).resolves.toEqual([]);
    expect(mockAxios.create).toHaveBeenCalledWith({ baseURL: 'https://sellingpartnerapi-na.amazon.com' });
    expect(mockHttp.request.mock.calls[1][0].url).not.toContain('CreatedAfter');
  });

  it('uses the generic Amazon error message when API errors omit a message', async () => {
    const client = new AmazonClient({
      clientId: 'client',
      clientSecret: 'secret',
      refreshToken: 'refresh',
      sellerId: 'seller',
      region: 'na',
      accessToken: 'token',
      accessTokenExpiry: 1770000001000,
    });
    mockHttp.request.mockResolvedValueOnce({ data: { errors: [] } });

    await expect(client.getProducts()).rejects.toThrow('Amazon API error');
  });
});
