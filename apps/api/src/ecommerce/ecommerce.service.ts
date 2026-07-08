import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { eq, and, sql, desc } from '@smart-erp/database/drizzle';
import {
  ecommerceStores,
  ecommerceSyncLogs,
  ecommerceChannelInventory,
  products,
  orders,
} from '@smart-erp/database/schema';
import { TikTokShopClient, TikTokShopConfig } from './tiktokshop.client';
import { AmazonClient, AmazonConfig } from './amazon.client';
import { EbayClient, EbayConfig } from './ebay.client';
import { ShopeeClient, ShopeeConfig } from './shopee.client';
import { encryptConfig, decryptConfig } from './config-encryption';
import { CreateStoreDto } from './dto/create-store.dto';

export interface SyncResult {
  storeId: string;
  platform: string;
  syncType: string;
  status: string;
  itemsProcessed: { products: number; orders: number; inventory: number };
  errors: string[];
  startedAt: Date;
  completedAt: Date;
}

@Injectable()
export class EcommerceService {
  /**
   * Sync all stores for a tenant — products, orders, and inventory in sequence.
   */
  async syncAllStores(tenantId: string, storeId?: string): Promise<SyncResult[]> {
    const conditions = [eq(ecommerceStores.tenantId, tenantId), eq(ecommerceStores.isActive, true)];
    if (storeId) conditions.push(eq(ecommerceStores.id, storeId));

    const stores = await db
      .select()
      .from(ecommerceStores)
      .where(and(...conditions));

    const results: SyncResult[] = [];
    for (const store of stores) {
      try {
        const result = await this.syncStoreProductsAndOrders(store);
        results.push(result);
      } catch (err: any) {
        results.push({
          storeId: store.id,
          platform: store.platform,
          syncType: 'all',
          status: 'failed',
          itemsProcessed: { products: 0, orders: 0, inventory: 0 },
          errors: [err.message ?? String(err)],
          startedAt: new Date(),
          completedAt: new Date(),
        });
      }
    }
    return results;
  }

  /**
   * Sync a single store: products + orders (with sync log).
   */
  async syncStoreProductsAndOrders(store: any): Promise<SyncResult> {
    const itemsProcessed = { products: 0, orders: 0, inventory: 0 };
    const errors: string[] = [];
    const startedAt = new Date();

    // 1. Sync products
    try {
      const productRes = await this.syncStoreProducts(store.id, store.tenantId);
      itemsProcessed.products = productRes || 0;
    } catch (err: any) {
      errors.push(`[Products] ${err.message ?? String(err)}`);
    }

    // 2. Sync inventory
    try {
      const inventoryRes = await this.syncStoreInventory(store.id, store.tenantId);
      itemsProcessed.inventory = inventoryRes || 0;
    } catch (err: any) {
      errors.push(`[Inventory] ${err.message ?? String(err)}`);
    }

    // 3. Sync orders
    try {
      const orderRes = await this.syncStoreOrders(store.id, store.tenantId);
      itemsProcessed.orders = orderRes || 0;
    } catch (err: any) {
      errors.push(`[Orders] ${err.message ?? String(err)}`);
    }

    const status = errors.length === 0 ? 'success' : itemsProcessed.products > 0 || itemsProcessed.orders > 0 ? 'partial' : 'failed';
    const completedAt = new Date();

    // Write sync log
    await db.insert(ecommerceSyncLogs).values({
      storeId: store.id,
      tenantId: store.tenantId,
      syncType: 'all',
      status,
      itemsProcessed: JSON.stringify(itemsProcessed),
      errorMessage: errors.length > 0 ? errors.join('; ') : null,
      startedAt,
      completedAt,
    } as any);

    // Update store last sync info
    await db
      .update(ecommerceStores)
      .set({ lastSyncAt: startedAt, lastSyncStatus: status })
      .where(eq(ecommerceStores.id, store.id));

    return { storeId: store.id, platform: store.platform, syncType: 'all', status, itemsProcessed, errors, startedAt, completedAt };
  }

  // ---------- TikTok Shop ----------

  async syncTikTokShopProducts(storeId: string, tenantId: string) {
    const store = await this.getStore(storeId, tenantId);
    const config: TikTokShopConfig = JSON.parse(store.configJson || '{}');
    const client = new TikTokShopClient(config);
    let page = 1;
    let total = 0;
    let hasMore = true;
    while (hasMore) {
      const res: any = await client.getProducts(page, 100);
      for (const product of res.products) {
        await this.upsertProductFromTikTok(store.tenantId, product);
        total++;
      }
      hasMore = res.pagination.has_more;
      page++;
    }
    return total;
  }

  async syncTikTokShopOrders(storeId: string, tenantId: string, since?: string) {
    const store = await this.getStore(storeId, tenantId);
    const config: TikTokShopConfig = JSON.parse(store.configJson || '{}');
    const client = new TikTokShopClient(config);
    let page = 1;
    let total = 0;
    let hasMore = true;
    while (hasMore) {
      const res: any = await client.getOrders(since, page, 100);
      for (const order of res.orders) {
        await this.upsertOrderFromTikTok(store.tenantId, order);
        total++;
      }
      hasMore = res.pagination.has_more;
      page++;
    }
    return total;
  }

  // ---------- Amazon ----------

  async syncAmazonProducts(storeId: string, tenantId: string) {
    const store = await this.getStore(storeId, tenantId);
    const config: AmazonConfig = JSON.parse(store.configJson || '{}');
    const client = new AmazonClient(config);
    const products = await client.getProducts();
    let total = 0;
    for (const product of products) {
      await this.upsertProductFromAmazon(store.tenantId, product);
      total++;
    }
    return total;
  }

  async syncAmazonOrders(storeId: string, tenantId: string) {
    const store = await this.getStore(storeId, tenantId);
    const config: AmazonConfig = JSON.parse(store.configJson || '{}');
    const client = new AmazonClient(config);
    const orders = await client.getOrders();
    let total = 0;
    for (const order of orders) {
      await this.upsertOrderFromAmazon(store.tenantId, order);
      total++;
    }
    return total;
  }



  // ---------- Shopee ----------

  async syncShopeeProducts(storeId: string, tenantId: string) {
    const store = await this.getStore(storeId, tenantId);
    const config: ShopeeConfig = JSON.parse(store.configJson || '{}');
    const client = new ShopeeClient(config);
    let page = 1;
    let total = 0;
    let hasMore = true;
    while (hasMore) {
      const res = await client.getProducts(page, 50);
      for (const product of res.products) {
        await this.upsertProductFromShopee(store.tenantId, product);
        total++;
      }
      hasMore = res.pagination.hasNext;
      page++;
    }
    return total;
  }

  async syncShopeeOrders(storeId: string, tenantId: string, since?: string) {
    const store = await this.getStore(storeId, tenantId);
    const config: ShopeeConfig = JSON.parse(store.configJson || '{}');
    const client = new ShopeeClient(config);
    let page = 1;
    let total = 0;
    let hasMore = true;
    while (hasMore) {
      const res = await client.getOrders(since, page, 50);
      for (const order of res.orders) {
        await this.upsertOrderFromShopee(store.tenantId, order);
        total++;
      }
      hasMore = res.pagination.hasMore;
      page++;
    }
    return total;
  }

  private async upsertProductFromShopee(tenantId: string, shopeeProduct: any) {
    const existing = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.externalId, shopeeProduct.id)))
      .then((r) => r[0]);
    const productData = {
      name: shopeeProduct.name,
      sku: shopeeProduct.sku || shopeeProduct.id,
      price: shopeeProduct.price || 0,
      stock: shopeeProduct.stock || 0,
      description: shopeeProduct.description || '',
      images: JSON.stringify(shopeeProduct.images || []),
      isActive: shopeeProduct.status === 'active',
      externalId: shopeeProduct.id,
      externalPlatform: 'shopee',
    };
    if (existing) {
      await db.update(products).set(productData).where(eq(products.id, existing.id));
    } else {
      await db.insert(products).values({ ...productData, tenantId } as any);
    }
  }

  private async upsertOrderFromShopee(tenantId: string, shopeeOrder: any) {
    const orderData = {
      tenantId,
      code: shopeeOrder.orderSn,
      customerName: shopeeOrder.recipientName || shopeeOrder.buyerName || '',
      customerPhone: shopeeOrder.recipientPhone || '',
      total: shopeeOrder.totalAmount || 0,
      status: shopeeOrder.status,
      channel: 'shopee',
      externalId: shopeeOrder.orderSn,
      externalPlatform: 'shopee',
    };
    await this.upsertOrder(tenantId, orderData);
  }

  // ---------- eBay ----------

  async syncEbayProducts(storeId: string, tenantId: string) {
    const store = await this.getStore(storeId, tenantId);
    const config: EbayConfig = JSON.parse(store.configJson || '{}');
    const client = new EbayClient(config);
    const products = await client.getProducts();
    let total = 0;
    for (const product of products) {
      await this.upsertProductFromEbay(store.tenantId, product);
      total++;
    }
    return total;
  }

  async syncEbayOrders(storeId: string, tenantId: string) {
    const store = await this.getStore(storeId, tenantId);
    const config: EbayConfig = JSON.parse(store.configJson || '{}');
    const client = new EbayClient(config);
    const orders = await client.getOrders();
    let total = 0;
    for (const order of orders) {
      await this.upsertOrderFromEbay(store.tenantId, order);
      total++;
    }
    return total;
  }

  // --------------- Private helpers --------------

  private async getStore(storeId: string, tenantId: string) {
    const row = await db
      .select()
      .from(ecommerceStores)
      .where(and(eq(ecommerceStores.id, storeId), eq(ecommerceStores.tenantId, tenantId)))
      .then((r) => r[0]);
    if (!row) throw new HttpException('Store not found', HttpStatus.NOT_FOUND);
    try {
      const configJson = decryptConfig(row.configJson);
      return { ...row, configJson };
    } catch {
      throw new HttpException('Unable to read store configuration', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async syncStoreProducts(storeId: string, tenantId: string): Promise<number> {
    const store = await this.getStore(storeId, tenantId);
    let total = 0;
    switch (store.platform) {
      case 'tiktokshop': total = await this.syncTikTokShopProducts(storeId, tenantId); break;
      case 'amazon': total = await this.syncAmazonProducts(storeId, tenantId); break;
      case 'ebay': total = await this.syncEbayProducts(storeId, tenantId); break;
      case 'shopee': total = await this.syncShopeeProducts(storeId, tenantId); break;
      default: throw new HttpException(`Unsupported platform for products: ${store.platform}`, HttpStatus.BAD_REQUEST);
    }
    return total;
  }

  private async syncStoreOrders(storeId: string, tenantId: string): Promise<number> {
    const store = await this.getStore(storeId, tenantId);
    let total = 0;
    switch (store.platform) {
      case 'tiktokshop': total = await this.syncTikTokShopOrders(storeId, tenantId); break;
      case 'amazon': total = await this.syncAmazonOrders(storeId, tenantId); break;
      case 'ebay': total = await this.syncEbayOrders(storeId, tenantId); break;
      case 'shopee': total = await this.syncShopeeOrders(storeId, tenantId); break;
      default: throw new HttpException(`Unsupported platform for orders: ${store.platform}`, HttpStatus.BAD_REQUEST);
    }
    return total;
  }

  private async syncStoreInventory(storeId: string, tenantId: string): Promise<number> {
    const store = await this.getStore(storeId, tenantId);
    const channelInventory = await db
      .select()
      .from(ecommerceChannelInventory)
      .where(eq(ecommerceChannelInventory.storeId, store.id));
    for (const inv of channelInventory) {
      await db
        .update(ecommerceChannelInventory)
        .set({ lastSyncedAt: new Date() })
        .where(eq(ecommerceChannelInventory.id, inv.id));
    }
    return channelInventory.length;
  }

  private async upsertProductFromTikTok(tenantId: string, tiktokProduct: any) {
    const existing = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.externalId, tiktokProduct.id)))
      .then((r) => r[0]);
    const productData = {
      name: tiktokProduct.title,
      sku: tiktokProduct.sku || tiktokProduct.id,
      price: String(parseFloat(tiktokProduct.price)),
      stock: tiktokProduct.quantity,
      description: tiktokProduct.description,
      images: JSON.stringify(tiktokProduct.images || []),
      isActive: true,
      externalId: tiktokProduct.id,
      externalPlatform: 'tiktokshop',
    };
    if (existing) {
      await db.update(products).set(productData as any).where(eq(products.id, existing.id));
    } else {
      await db.insert(products).values({ ...productData, tenantId } as any);
    }
  }

  private async upsertOrderFromTikTok(tenantId: string, tiktokOrder: any) {
    const orderData = {
      tenantId,
      code: tiktokOrder.order_id,
      customerName: tiktokOrder.buyer_name,
      customerPhone: tiktokOrder.buyer_phone,
      total: parseFloat(tiktokOrder.total_amount),
      status: this.mapTikTokStatus(tiktokOrder.order_status),
      channel: 'tiktokshop',
      externalId: tiktokOrder.order_id,
      externalPlatform: 'tiktokshop',
    };
    await this.upsertOrder(tenantId, orderData);
  }

  private async upsertProductFromAmazon(tenantId: string, amazonProduct: any) {
    const existing = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.externalId, amazonProduct.asin)))
      .then((r) => r[0]);
    const productData = {
      name: amazonProduct.title,
      sku: amazonProduct.seller_sku || amazonProduct.asin,
      price: String(parseFloat(amazonProduct.price?.Amount || 0)),
      stock: parseInt(amazonProduct.quantity || '0'),
      description: amazonProduct.product_description,
      images: JSON.stringify(amazonProduct.images || []),
      isActive: true,
      externalId: amazonProduct.asin,
      externalPlatform: 'amazon',
    };
    if (existing) {
      await db.update(products).set(productData as any).where(eq(products.id, existing.id));
    } else {
      await db.insert(products).values({ ...productData, tenantId } as any);
    }
  }

  private async upsertOrderFromAmazon(tenantId: string, amazonOrder: any) {
    const orderData = {
      tenantId,
      code: amazonOrder.AmazonOrderId,
      customerName: amazonOrder.BuyerName,
      customerPhone: amazonOrder.ShippingAddress?.Phone || '',
      total: parseFloat(amazonOrder.OrderTotal?.Amount || '0'),
      status: this.mapAmazonStatus(amazonOrder.OrderStatus),
      channel: 'amazon',
      externalId: amazonOrder.AmazonOrderId,
      externalPlatform: 'amazon',
    };
    await this.upsertOrder(tenantId, orderData);
  }

  private async upsertProductFromEbay(tenantId: string, ebayProduct: any) {
    const existing = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.externalId, ebayProduct.itemId)))
      .then((r) => r[0]);
    const productData = {
      name: ebayProduct.title,
      sku: ebayProduct.sku || ebayProduct.itemId,
      price: String(parseFloat(ebayProduct.price?.value || 0)),
      stock: parseInt(ebayProduct.quantity || '0'),
      description: ebayProduct.description || '',
      images: JSON.stringify(ebayProduct.images || []),
      isActive: true,
      externalId: ebayProduct.itemId,
      externalPlatform: 'ebay',
    };
    if (existing) {
      await db.update(products).set(productData as any).where(eq(products.id, existing.id));
    } else {
      await db.insert(products).values({ ...productData, tenantId } as any);
    }
  }

  private async upsertOrderFromEbay(tenantId: string, ebayOrder: any) {
    const orderData = {
      tenantId,
      code: ebayOrder.orderId,
      customerName: ebayOrder.buyer?.username || '',
      customerPhone: '',
      total: parseFloat(ebayOrder.total?.value || '0'),
      status: this.mapEbayStatus(ebayOrder.orderStatus),
      channel: 'ebay',
      externalId: ebayOrder.orderId,
      externalPlatform: 'ebay',
    };
    await this.upsertOrder(tenantId, orderData);
  }

  private async upsertOrder(tenantId: string, orderData: any) {
    if (orderData.total && typeof orderData.total === 'number') {
      orderData.total = orderData.total.toString();
    }
    const existing = await db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.externalId, orderData.externalId)))
      .then((r) => r[0]);
    if (existing) {
      await db.update(orders).set(orderData).where(eq(orders.id, existing.id));
    } else {
      await db.insert(orders).values(orderData as any);
    }
  }

  private mapTikTokStatus(status: string): string {
    const map: Record<string, string> = {
      AWAITING_PAYMENT: 'pending',
      PAID: 'confirmed',
      PROCESSING: 'processing',
      SHIPPED: 'shipped',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
    };
    return map[status] || 'pending';
  }

  private mapAmazonStatus(status: string): string {
    const map: Record<string, string> = {
      Pending: 'pending',
      Unshipped: 'confirmed',
      PartiallyShipped: 'processing',
      Shipped: 'shipped',
      Delivered: 'delivered',
      Canceled: 'cancelled',
    };
    return map[status] || 'pending';
  }

  private async mapEbayStatus(status: string): Promise<string> {
    const map: Record<string, string> = {
      PAID: 'confirmed',
      SHIPPED: 'shipped',
      COMPLETED: 'delivered',
      CANCELLED: 'cancelled',
    };
    return map[status] || 'pending';
  }

  async getStores(tenantId: string) {
    const stores = await db
      .select()
      .from(ecommerceStores)
      .where(eq(ecommerceStores.tenantId, tenantId))
      .orderBy(desc(ecommerceStores.createdAt));
    // Never expose encrypted credentials in list endpoints.
    return stores.map(({ configJson, ...store }) => store);
  }

  async createStore(tenantId: string, dto: CreateStoreDto) {
    const encryptedConfig = encryptConfig(JSON.stringify(dto.configJson));
    const [store] = await db
      .insert(ecommerceStores)
      .values({
        tenantId,
        platform: dto.platform,
        name: dto.name,
        configJson: encryptedConfig,
        isActive: dto.isActive ?? true,
      })
      .returning();
    return { ...store, configJson: dto.configJson };
  }

  async getSyncLogs(tenantId: string, storeId?: string) {
    const conditions = [eq(ecommerceSyncLogs.tenantId, tenantId)];
    if (storeId) conditions.push(eq(ecommerceSyncLogs.storeId, storeId));
    return db
      .select()
      .from(ecommerceSyncLogs)
      .where(and(...conditions))
      .orderBy(desc(ecommerceSyncLogs.createdAt))
      .limit(50);
  }
}
