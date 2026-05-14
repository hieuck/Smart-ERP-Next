import axios from 'axios';
import crypto from 'crypto';

export interface ShopeeConfig {
  partnerId: string;
  partnerKey: string;
  shopId: string;
  accessToken?: string;
  apiUrl?: string; // default: https://partner.shopeemobile.com
}

/**
 * Shopee Open Platform API Client
 * Docs: https://open.shopee.com/documents
 *
 * Signature formula: hex(sha256(base_url + api_path | body_json | partner_id + api_path + access_token + timestamp))
 */
export class ShopeeClient {
  private config: ShopeeConfig;
  private baseUrl: string;

  constructor(config: ShopeeConfig) {
    this.config = config;
    this.baseUrl = config.apiUrl || 'https://partner.shopeemobile.com';
  }

  /**
   * Generate HMAC-SHA256 signature for Shopee API
   */
  private sign(path: string, body: Record<string, any> = {}, timestamp?: number): string {
    const ts = timestamp || Math.floor(Date.now() / 1000);
    const bodyStr = JSON.stringify(body);
    const baseStr = `${this.config.partnerId}${path}${ts}${this.config.accessToken || ''}${bodyStr}`;
    return crypto.createHmac('sha256', this.config.partnerKey).update(baseStr).digest('hex');
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    body: Record<string, any> = {},
  ): Promise<T> {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.sign(path, body, timestamp);

    const url = `${this.baseUrl}${path}`;
    const params: any = {
      partner_id: parseInt(this.config.partnerId),
      timestamp,
      sign,
      shop_id: parseInt(this.config.shopId),
    };

    if (this.config.accessToken) {
      params.access_token = this.config.accessToken;
    }

    const config = {
      method,
      url,
      params: method === 'GET' ? params : undefined,
      data: method !== 'GET' ? { ...body, ...params } : undefined,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };

    const response = await axios(config);

    if (response.data.error && response.data.error.length > 0) {
      throw new Error(`Shopee API error [${path}]: ${response.data.error} - ${response.data.message || response.data.msg}`);
    }

    return response.data.response || response.data;
  }

  // ---------- Products ----------

  /**
   * Get product list from Shopee shop
   * https://open.shopee.com/documents/v2/v2.product.get_item_list
   */
  async getProducts(page = 1, pageSize = 50, offset = 0) {
    const body = {
      pagination: {
        offset: offset || (page - 1) * pageSize,
        page_size: pageSize,
      },
    };
    const result = await this.request<{
      item: Array<{
        item_id: number;
        item_name: string;
        item_sku: string;
        price_info: Array<{ original_price: number; current_price: number }>;
        stock_info: Array<{ current_stock: number; reserved_stock: number; sold_stock: number }>;
        image: { image_url_list: string[] };
        item_status: string;
        create_time: number;
        update_time: number;
        description?: string;
        weight?: number;
        dimension?: { package_length: number; package_width: number; package_height: number };
        category_id?: number;
        brand?: { brand_id: number; brand_name: string };
      }>;
      has_next_page: boolean;
      total_count: number;
    }>('POST', '/api/v2/product/get_item_list', body);

    return {
      products: (result.item || []).map((item) => ({
        id: String(item.item_id),
        name: item.item_name,
        sku: item.item_sku || String(item.item_id),
        price: item.price_info?.[0]?.current_price || item.price_info?.[0]?.original_price || 0,
        stock: item.stock_info?.[0]?.current_stock || 0,
        images: item.image?.image_url_list || [],
        status: item.item_status === 'NORMAL' ? 'active' : 'inactive',
        description: item.description || '',
        weight: item.weight || 0,
        categoryId: item.category_id || 0,
        brand: item.brand?.brand_name || '',
        createTime: new Date(item.create_time * 1000).toISOString(),
        updateTime: new Date(item.update_time * 1000).toISOString(),
      })),
      pagination: {
        hasNext: result.has_next_page || false,
        total: result.total_count || 0,
        page,
        pageSize,
      },
    };
  }

  /**
   * Get detailed product info
   */
  async getProductDetail(itemId: number) {
    const result = await this.request('POST', '/api/v2/product/get_item_base_info', {
      item_id_list: [itemId],
    });
    const item = result?.item_list?.[0];
    if (!item) throw new Error(`Product ${itemId} not found on Shopee`);

    return {
      id: String(item.item_id),
      name: item.item_name,
      sku: item.item_sku,
      description: item.description || '',
      images: item.image?.image_url_list || [],
      price: item.price_info?.[0]?.current_price || 0,
      stock: item.stock_info?.[0]?.current_stock || 0,
      status: item.item_status,
      weight: item.weight,
      categoryId: item.category_id?.toString() || '',
      brand: item.brand?.brand_name || '',
    };
  }

  /**
   * Update product stock on Shopee
   * https://open.shopee.com/documents/v2/v2.product.update_stock
   */
  async updateStock(itemId: number, stock: number) {
    const result = await this.request('POST', '/api/v2/product/update_stock', {
      item_id: itemId,
      stock_list: [{ stock }],
    });
    return result;
  }

  /**
   * Batch update stock for multiple items
   */
  async batchUpdateStock(items: Array<{ itemId: number; stock: number }>) {
    const stockList = items.map((i) => ({ item_id: i.item_id, stock: i.stock }));
    const result = await this.request('POST', '/api/v2/product/update_stock', {
      stock_list: stockList,
    });
    return result;
  }

  // ---------- Orders ----------

  /**
   * Get order list from Shopee
   * https://open.shopee.com/documents/v2/v2.order.get_order_list
   */
  async getOrders(since?: string, page = 1, pageSize = 50) {
    const timeFrom = since
      ? Math.floor(new Date(since).getTime() / 1000)
      : Math.floor(Date.now() / 1000) - 7 * 86400; // Last 7 days default

    const body = {
      time_range_field: 'create_time',
      time_from: timeFrom,
      time_to: Math.floor(Date.now() / 1000),
      pagination: {
        offset: (page - 1) * pageSize,
        page_size: pageSize,
      },
      order_status: 'ALL',
    };

    const result = await this.request<{
      order_list: Array<{
        order_sn: string;
        order_status: string;
        create_time: number;
        update_time: number;
        buyer_user_id: number;
        buyer_username: string;
        recipient_address: {
          name: string;
          phone: string;
          full_address: string;
        };
        total_amount: number;
        currency: string;
        payment_method: string;
        shipping_carrier?: string;
        tracking_number?: string;
      }>;
      more: boolean;
      next_offset: number;
    }>('POST', '/api/v2/order/get_order_list', body);

    return {
      orders: (result.order_list || []).map((order) => ({
        orderSn: order.order_sn,
        status: this.mapOrderStatus(order.order_status),
        createdAt: new Date(order.create_time * 1000).toISOString(),
        updatedAt: new Date(order.update_time * 1000).toISOString(),
        buyerName: order.buyer_username || '',
        recipientName: order.recipient_address?.name || '',
        recipientPhone: order.recipient_address?.phone || '',
        recipientAddress: order.recipient_address?.full_address || '',
        totalAmount: order.total_amount || 0,
        currency: order.currency || 'VND',
        paymentMethod: order.payment_method || '',
        shippingCarrier: order.shipping_carrier || '',
        trackingNumber: order.tracking_number || '',
      })),
      pagination: {
        hasMore: result.more || false,
        nextOffset: result.next_offset || 0,
        page,
        pageSize,
      },
    };
  }

  /**
   * Get order detail with items
   */
  async getOrderDetail(orderSn: string) {
    const result = await this.request<{
      order_sn: string;
      order_status: string;
      create_time: number;
      item_list: Array<{
        item_id: number;
        item_name: string;
        item_sku: string;
        model_id: number;
        model_name: string;
        original_price: number;
        discounted_price: number;
        quantity: number;
      }>;
    }>('POST', '/api/v2/order/get_order_detail', { order_sn_list: [orderSn] });

    const order = result;
    if (!order) throw new Error(`Order ${orderSn} not found on Shopee`);

    return {
      orderSn: order.order_sn,
      status: this.mapOrderStatus(order.order_status),
      createdAt: new Date(order.create_time * 1000).toISOString(),
      items: (order.item_list || []).map((item) => ({
        itemId: String(item.item_id),
        name: item.item_name,
        sku: item.item_sku || String(item.item_id),
        modelName: item.model_name || '',
        price: item.discounted_price || item.original_price || 0,
        quantity: item.quantity || 1,
      })),
    };
  }

  /**
   * Get order items (for building local order_items)
   */
  async getOrderItems(orderSn: string) {
    const order = await this.getOrderDetail(orderSn);
    return order.items;
  }

  // ---------- Auth ----------

  /**
   * Refresh access token
   * https://open.shopee.com/documents/v2/v2.shop.refresh_access_token
   */
  async refreshAccessToken(refreshToken: string) {
    const result = await this.request<{
      access_token: string;
      refresh_token: string;
      expire_in: number;
    }>('POST', '/api/v2/auth/access_token/get', {
      refresh_token: refreshToken,
      partner_id: parseInt(this.config.partnerId),
      shop_id: parseInt(this.config.shopId),
    });

    this.config.accessToken = result.access_token;
    return result;
  }

  /**
   * Verify webhook signature (for Shopee push notifications)
   */
  verifyWebhook(payload: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.config.partnerKey)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  // ---------- Helpers ----------

  /**
   * Map Shopee order status to internal ERP status
   */
  private mapOrderStatus(shopeeStatus: string): string {
    const mapping: Record<string, string> = {
      UNPAID: 'pending',
      READY_TO_SHIP: 'confirmed',
      SHIPPED: 'shipped',
      TO_CONFIRM_RECEIVE: 'shipped',
      COMPLETED: 'delivered',
      CANCELLED: 'cancelled',
      IN_CANCEL: 'cancelled',
      RETURNED: 'returned',
      TO_RETURN: 'returned',
    };
    return mapping[shopeeStatus] || 'pending';
  }
}
