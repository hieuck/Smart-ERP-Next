const mockAxios = {
  get: jest.fn(),
};

jest.mock('axios', () => mockAxios);

import { EbayClient } from './ebay.client';

describe('EbayClient coverage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads products and orders with auth headers and pagination', async () => {
    const client = new EbayClient({
      appId: 'app',
      certId: 'cert',
      devId: 'dev',
      siteId: 100,
      userToken: 'token-1',
    });
    mockAxios.get
      .mockResolvedValueOnce({ data: { inventoryItems: [{ sku: 'SKU-1' }] } })
      .mockResolvedValueOnce({ data: { orders: [{ id: 'order-1' }] } });

    await expect(client.getProducts(3, 25)).resolves.toEqual([{ sku: 'SKU-1' }]);
    await expect(client.getOrders(new Date('2026-05-21T00:00:00.000Z'), 2, 10)).resolves.toEqual([
      { id: 'order-1' },
    ]);

    expect(mockAxios.get).toHaveBeenNthCalledWith(
      1,
      'https://api.ebay.com/sell/inventory/v1/inventory_item',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-1',
          'X-EBAY-API-SITEID': '100',
        }),
        params: { limit: 25, offset: 50 },
      }),
    );
    expect(mockAxios.get).toHaveBeenNthCalledWith(
      2,
      'https://api.ebay.com/sell/fulfillment/v1/order',
      expect.objectContaining({
        params: {
          creation_date_range_from: '2026-05-21T00:00:00.000Z',
          limit: 10,
          offset: 10,
        },
      }),
    );
  });

  it('uses defaults and empty payload fallbacks', async () => {
    const client = new EbayClient({ appId: 'app', certId: 'cert', devId: 'dev', userToken: 'token-1' });
    mockAxios.get.mockResolvedValueOnce({ data: {} }).mockResolvedValueOnce({ data: {} });

    await expect(client.getProducts()).resolves.toEqual([]);
    await expect(client.getOrders()).resolves.toEqual([]);
    await expect(client.getCustomers()).resolves.toEqual([]);
  });
});
