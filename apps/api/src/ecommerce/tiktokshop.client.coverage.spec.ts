const mockAxios = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: mockAxios,
}));

import { TikTokShopClient } from './tiktokshop.client';

describe('TikTokShopClient coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('signs product, order, customer, and webhook API requests', async () => {
    const client = new TikTokShopClient({
      appKey: 'app-key',
      appSecret: 'secret',
      shopId: 'shop-1',
      accessToken: 'access',
    });
    mockAxios.mockResolvedValue({ data: { code: 0, data: { ok: true } } });

    await expect(client.getProducts(2, 25)).resolves.toEqual({ ok: true });
    await expect(client.getOrders('2026-05-20T00:00:00.000Z', 3, 10)).resolves.toEqual({ ok: true });
    await expect(client.getCustomers(4, 15)).resolves.toEqual({ ok: true });
    await expect(client.registerWebhooks('https://example.test/hook')).resolves.toBeUndefined();

    expect(mockAxios).toHaveBeenCalledTimes(6);
    expect(mockAxios).toHaveBeenNthCalledWith(1, expect.objectContaining({
      method: 'POST',
      url: 'https://open-api.tiktokglobalshop.com/api/2024-10/products/search',
      headers: expect.objectContaining({
        'x-tiktok-sign': expect.any(String),
        'access-token': 'access',
      }),
    }));
  });

  it('throws clear errors for non-zero TikTok response codes', async () => {
    const client = new TikTokShopClient({ appKey: 'app-key', appSecret: 'secret', shopId: 'shop-1' });
    mockAxios.mockResolvedValueOnce({ data: { code: 400, message: 'invalid signature' } });

    await expect(client.getProducts()).rejects.toThrow('TikTok API error: invalid signature');
  });

  it('uses default request arguments and custom API versions', async () => {
    const client = new TikTokShopClient({
      appKey: 'app-key',
      appSecret: 'secret',
      shopId: 'shop-1',
      apiVersion: '2025-01',
    });
    mockAxios.mockResolvedValue({ data: { code: 0, data: { ok: true } } });

    expect((client as any).signRequest('/ping', 'GET')).toEqual(expect.any(String));
    await expect(client.getOrders()).resolves.toEqual({ ok: true });
    await expect(client.getCustomers()).resolves.toEqual({ ok: true });

    expect(mockAxios).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({ page: 1, page_size: 50 }),
      url: 'https://open-api.tiktokglobalshop.com/api/2025-01/orders/search',
    }));
    expect(mockAxios).toHaveBeenNthCalledWith(2, expect.objectContaining({
      url: 'https://open-api.tiktokglobalshop.com/api/2025-01/customers/search?page=1&page_size=50',
    }));
  });
});
