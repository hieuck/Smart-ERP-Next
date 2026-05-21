jest.mock('axios', () => jest.fn());

import axios from 'axios';
import crypto from 'crypto';
import { ShopeeClient } from './shopee.client';

const mockedAxios = axios as unknown as jest.Mock;

describe('ShopeeClient coverage', () => {
  let client: ShopeeClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1770000000000);
    client = new ShopeeClient({
      partnerId: '123',
      partnerKey: 'secret',
      shopId: '456',
      accessToken: 'token',
      apiUrl: 'https://shopee.test',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps Shopee products with pagination defaults', async () => {
    mockedAxios.mockResolvedValueOnce({
      data: {
        response: {
          item: [
            {
              item_id: 10,
              item_name: 'Ao thun',
              item_sku: '',
              price_info: [{ original_price: 120000, current_price: 99000 }],
              stock_info: [{ current_stock: 5 }],
              image: { image_url_list: ['https://image.test/a.jpg'] },
              item_status: 'NORMAL',
              create_time: 1700000000,
              update_time: 1700001000,
              description: 'Cotton',
              weight: 0.2,
              category_id: 99,
              brand: { brand_name: 'Smart' },
            },
          ],
          has_next_page: true,
          total_count: 12,
        },
      },
    });

    await expect(client.getProducts(2, 5)).resolves.toEqual({
      products: [
        expect.objectContaining({
          id: '10',
          name: 'Ao thun',
          sku: '10',
          price: 99000,
          stock: 5,
          images: ['https://image.test/a.jpg'],
          status: 'active',
          brand: 'Smart',
        }),
      ],
      pagination: { hasNext: true, total: 12, page: 2, pageSize: 5 },
    });
    expect(mockedAxios.mock.calls[0][0]).toMatchObject({
      method: 'POST',
      url: 'https://shopee.test/api/v2/product/get_item_list',
    });
  });

  it('supports unsigned GET requests with default host, body, and timestamp values', async () => {
    const anonClient = new ShopeeClient({
      partnerId: '123',
      partnerKey: 'secret',
      shopId: '456',
    });
    mockedAxios.mockResolvedValueOnce({ data: { pong: true } });

    await expect((anonClient as any).request('GET', '/api/v2/ping')).resolves.toEqual({ pong: true });

    expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      url: 'https://partner.shopeemobile.com/api/v2/ping',
      data: undefined,
      params: expect.not.objectContaining({ access_token: expect.anything() }),
    }));
    expect((anonClient as any).sign('/api/v2/ping')).toEqual(expect.any(String));
  });

  it('maps product fallbacks, empty pagination, and explicit offsets', async () => {
    mockedAxios
      .mockResolvedValueOnce({
        data: {
          response: {
            item: [
              {
                item_id: 11,
                item_name: 'Quan jean',
                item_sku: 'JEAN-11',
                price_info: [{ original_price: 250000 }],
                stock_info: [{}],
                item_status: 'BANNED',
                create_time: 1700000000,
                update_time: 1700001000,
              },
              {
                item_id: 12,
                item_name: 'Non tron',
                create_time: 1700000000,
                update_time: 1700001000,
              },
            ],
          },
        },
      })
      .mockResolvedValueOnce({ data: { response: {} } });

    await expect(client.getProducts()).resolves.toEqual({
      products: [
        expect.objectContaining({
          id: '11',
          sku: 'JEAN-11',
          price: 250000,
          stock: 0,
          images: [],
          status: 'inactive',
          description: '',
          weight: 0,
          categoryId: 0,
          brand: '',
        }),
        expect.objectContaining({
          id: '12',
          price: 0,
        }),
      ],
      pagination: { hasNext: false, total: 0, page: 1, pageSize: 50 },
    });
    await expect(client.getProducts(3, 10, 25)).resolves.toEqual({
      products: [],
      pagination: { hasNext: false, total: 0, page: 3, pageSize: 10 },
    });
    expect(mockedAxios.mock.calls[1][0].data.pagination.offset).toBe(25);
  });

  it('handles product detail, not-found, stock update, and batch stock payloads', async () => {
    mockedAxios
      .mockResolvedValueOnce({
        data: {
          response: {
            item_list: [
              {
                item_id: 10,
                item_name: 'Ao thun',
                item_sku: 'SKU-10',
                price_info: [{ current_price: 99000 }],
                stock_info: [{ current_stock: 8 }],
                item_status: 'NORMAL',
                image: { image_url_list: [] },
              },
            ],
          },
        },
      })
      .mockResolvedValueOnce({ data: { response: { item_list: [] } } })
      .mockResolvedValueOnce({ data: { response: { success: true } } })
      .mockResolvedValueOnce({ data: { response: { success: true } } });

    await expect(client.getProductDetail(10)).resolves.toMatchObject({
      id: '10',
      sku: 'SKU-10',
      price: 99000,
      stock: 8,
    });
    await expect(client.getProductDetail(99)).rejects.toThrow('Product 99 not found on Shopee');

    await expect(client.updateStock(10, 7)).resolves.toEqual({ success: true });
    await expect(client.batchUpdateStock([{ itemId: 10, stock: 7 }])).resolves.toEqual({ success: true });

    expect(mockedAxios.mock.calls[3][0].data.stock_list).toEqual([
      { item_id: 10, stock: 7 },
    ]);
  });

  it('maps product detail fallbacks when optional Shopee fields are absent', async () => {
    mockedAxios.mockResolvedValueOnce({
      data: {
        response: {
          item_list: [
            {
              item_id: 12,
              item_name: 'Non son',
              item_sku: 'NON-12',
              item_status: 'NORMAL',
            },
          ],
        },
      },
    });

    await expect(client.getProductDetail(12)).resolves.toMatchObject({
      id: '12',
      description: '',
      images: [],
      price: 0,
      stock: 0,
      categoryId: '',
      brand: '',
    });
  });

  it('maps order list, order details, order items, auth refresh, webhook signatures, and API errors', async () => {
    mockedAxios
      .mockResolvedValueOnce({
        data: {
          response: {
            order_list: [
              {
                order_sn: 'SN-1',
                order_status: 'READY_TO_SHIP',
                create_time: 1700000000,
                update_time: 1700001000,
                buyer_username: 'buyer',
                recipient_address: { name: 'Nguyen Van A', phone: '0900', full_address: 'TP HCM' },
                total_amount: 250000,
                currency: 'VND',
                payment_method: 'COD',
                shipping_carrier: 'SPX',
                tracking_number: 'TRACK-1',
              },
            ],
            more: true,
            next_offset: 50,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          response: {
            order_sn: 'SN-1',
            order_status: 'COMPLETED',
            create_time: 1700000000,
            item_list: [{ item_id: 10, item_name: 'Ao', item_sku: '', model_name: '', original_price: 100000, discounted_price: 90000, quantity: 2 }],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          response: {
            order_sn: 'SN-2',
            order_status: 'RETURNED',
            create_time: 1700000000,
            item_list: [{ item_id: 11, item_name: 'Quan', item_sku: 'SKU-11', model_name: 'M', original_price: 200000, discounted_price: 0, quantity: 1 }],
          },
        },
      })
      .mockResolvedValueOnce({
        data: { response: { access_token: 'token-new', refresh_token: 'refresh-new', expire_in: 3600 } },
      })
      .mockResolvedValueOnce({ data: { error: 'bad_param', message: 'Bad request' } });

    await expect(client.getOrders('2026-05-01', 2, 50)).resolves.toMatchObject({
      orders: [expect.objectContaining({ orderSn: 'SN-1', status: 'confirmed', recipientName: 'Nguyen Van A' })],
      pagination: { hasMore: true, nextOffset: 50, page: 2, pageSize: 50 },
    });
    await expect(client.getOrderDetail('SN-1')).resolves.toMatchObject({
      orderSn: 'SN-1',
      status: 'delivered',
      items: [expect.objectContaining({ itemId: '10', sku: '10', price: 90000 })],
    });
    await expect(client.getOrderItems('SN-2')).resolves.toEqual([
      expect.objectContaining({ itemId: '11', sku: 'SKU-11', price: 200000 }),
    ]);
    await expect(client.refreshAccessToken('refresh-old')).resolves.toEqual({
      access_token: 'token-new',
      refresh_token: 'refresh-new',
      expire_in: 3600,
    });

    const payload = '{"order_sn":"SN-1"}';
    const signature = crypto.createHmac('sha256', 'secret').update(payload).digest('hex');
    expect(client.verifyWebhook(payload, signature)).toBe(true);

    await expect(client.updateStock(10, 1)).rejects.toThrow(
      'Shopee API error [/api/v2/product/update_stock]: bad_param - Bad request',
    );
  });

  it('maps order defaults, missing order details, and alternate API error message fields', async () => {
    mockedAxios
      .mockResolvedValueOnce({
        data: {
          response: {
            order_list: [
              {
                order_sn: 'SN-EMPTY',
                order_status: 'UNKNOWN',
                create_time: 1700000000,
                update_time: 1700001000,
              },
            ],
          },
        },
      })
      .mockResolvedValueOnce({ data: { response: {} } })
      .mockResolvedValueOnce({
        data: {
          response: {
            order_sn: 'SN-FALLBACK',
            order_status: 'CANCELLED',
            create_time: 1700000000,
            item_list: [{ item_id: 99, item_name: 'Fallback', item_sku: '', model_name: '', original_price: 0, discounted_price: 0, quantity: 0 }],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          response: {
            order_sn: 'SN-NO-ITEMS',
            order_status: 'READY_TO_SHIP',
            create_time: 1700000000,
          },
        },
      })
      .mockResolvedValueOnce({ data: { error: 'bad_param', msg: 'Bad msg' } });

    await expect(client.getOrders()).resolves.toMatchObject({
      orders: [
        expect.objectContaining({
          status: 'pending',
          buyerName: '',
          recipientName: '',
          recipientPhone: '',
          recipientAddress: '',
          totalAmount: 0,
          currency: 'VND',
          paymentMethod: '',
          shippingCarrier: '',
          trackingNumber: '',
        }),
      ],
      pagination: { hasMore: false, nextOffset: 0, page: 1, pageSize: 50 },
    });
    await expect(client.getOrders()).resolves.toEqual({
      orders: [],
      pagination: { hasMore: false, nextOffset: 0, page: 1, pageSize: 50 },
    });
    await expect(client.getOrderDetail('SN-FALLBACK')).resolves.toMatchObject({
      items: [expect.objectContaining({ price: 0, quantity: 1 })],
      status: 'cancelled',
    });
    await expect(client.getOrderDetail('SN-NO-ITEMS')).resolves.toMatchObject({
      items: [],
      status: 'confirmed',
    });

    jest.spyOn(client as any, 'request').mockResolvedValueOnce(null);
    await expect(client.getOrderDetail('SN-MISSING')).rejects.toThrow('Order SN-MISSING not found on Shopee');
    (client as any).request.mockRestore();

    await expect(client.updateStock(10, 1)).rejects.toThrow(
      'Shopee API error [/api/v2/product/update_stock]: bad_param - Bad msg',
    );
  });
});
