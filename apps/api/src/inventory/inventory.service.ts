import { Injectable, ConflictException, BadGatewayException } from "@nestjs/common";
import { db } from "@smart-erp/database";
import { products, inventoryTransactions, inventoryReservations, ecommerceStores } from "@smart-erp/database/schema";
import { eq, and, sql, desc, gte, lte } from "@smart-erp/database/drizzle";

@Injectable()
export class InventoryService {
  async getReorderSuggestions(tenantId: string) {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        stock: products.stock,
        minStock: products.minStock,
        reorderQuantity: products.reorderQuantity,
      })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)))
      .orderBy(products.stock);

    return rows
      .map((p) => ({ product: p, minStock: p.minStock ?? 0 }))
      .filter(({ product, minStock }) => minStock > 0 && product.stock <= minStock)
      .map(({ product, minStock }) => ({
        ...product,
        suggestedOrderQuantity: Math.max(
          (product.reorderQuantity ?? 0) || (minStock - product.stock),
          0,
        ),
      }))
      .filter((p) => p.suggestedOrderQuantity > 0);
  }

  async getTransactions(
    tenantId: string,
    query: { page?: number; limit?: number; productId?: string; type?: string },
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 30, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(inventoryTransactions.tenantId, tenantId)];
    if (query.productId)
      conditions.push(eq(inventoryTransactions.productId, query.productId));
    if (query.type) conditions.push(eq(inventoryTransactions.type, query.type));

    const where = and(...conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryTransactions)
      .where(where);

    const items = await db
      .select()
      .from(inventoryTransactions)
      .where(where)
      .orderBy(desc(inventoryTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async adjust(
    tenantId: string,
    userId: string,
    productId: string,
    quantity: number,
    type: "IN" | "OUT" | "ADJUSTMENT",
    notes?: string,
    reference?: string,
  ) {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)));

    if (!product) throw new ConflictException("Product not found");

    const previousStock = product.stock;
    const newStock =
      type === "OUT" ? previousStock - quantity : previousStock + quantity;

    if (newStock < 0) {
      throw new ConflictException(
        `Insufficient stock. Available: ${previousStock}, requested: ${quantity}`,
      );
    }

    const [updated] = await db
      .update(products)
      .set({ stock: newStock, updatedAt: new Date() })
      .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)))
      .returning();

    await db.insert(inventoryTransactions).values({
      tenantId,
      productId,
      type,
      quantity,
      previousStock,
      newStock,
      reference: reference ?? null,
      notes: notes ?? null,
      createdBy: userId,
    });

    return {
      product: updated,
      previousStock,
      newStock,
      delta: newStock - previousStock,
    };
  }

  async getLowStock(tenantId: string) {
    return db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          eq(products.isActive, true),
          sql`stock <= min_stock`,
        ),
      )
      .orderBy(products.stock);
  }

  async getSummary(tenantId: string) {
    const rows = await db.execute(
      sql`
        SELECT
          COUNT(*)::int AS total_products,
          SUM(stock)::int AS total_units,
          SUM(stock * cost::numeric)::numeric AS total_value,
          COUNT(*) FILTER (WHERE stock = 0)::int AS out_of_stock,
          COUNT(*) FILTER (WHERE stock <= min_stock AND stock > 0)::int AS low_stock
        FROM products
        WHERE tenant_id = ${tenantId} AND is_active = true
      `,
    );
    const r = (rows.rows as any[])[0] ?? {};
    return {
      totalProducts: r.total_products ?? 0,
      totalUnits: r.total_units ?? 0,
      totalValue: parseFloat(r.total_value ?? "0"),
      outOfStock: r.out_of_stock ?? 0,
      lowStock: r.low_stock ?? 0,
    };
  }

  // ---------- Omnichannel Inventory Sync ----------

  /**
   * Get available stock for a product (considering reservations and safety buffer).
   * available = stock - safetyStockBuffer - reservedQuantity
   */
  async getAvailableStock(
    tenantId: string,
    productId: string,
    storeId?: string,
  ): Promise<number> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)));

    if (!product) return 0;

    // Get safety stock buffer from store settings (default 0)
    let safetyStock = 0;
    if (storeId) {
      const [store] = await db
        .select()
        .from(ecommerceStores)
        .where(and(eq(ecommerceStores.tenantId, tenantId), eq(ecommerceStores.id, storeId)));
      if (store) {
        const config = JSON.parse(store.configJson || '{}');
        safetyStock = config.safetyStockBuffer ?? 0;
      }
    }

    // Get reserved quantity
    const reservedRes = await db
      .select({ sum: sql<number>`sum(${inventoryReservations.quantityReserved})` })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.tenantId, tenantId),
          eq(inventoryReservations.productId, productId),
          eq(inventoryReservations.status, 'reserved'),
          storeId ? eq(inventoryReservations.storeId, storeId) : undefined,
        ),
      );

    const reserved = reservedRes[0]?.sum ?? 0;

    return Math.max(0, product.stock - safetyStock - reserved);
  }

  /**
   * Create a reservation for an external order (from marketplace).
   * Reduces available stock until fulfilled/cancelled.
   */
  async createReservation(
    tenantId: string,
    storeId: string,
    externalOrderId: string,
    productId: string,
    quantity: number,
  ) {
    // Check if reservation already exists for this order
    const existing = await db
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.tenantId, tenantId),
          eq(inventoryReservations.externalOrderId, externalOrderId),
        ),
      );

    if (existing.length > 0) {
      // Update existing reservation
      return db
        .update(inventoryReservations)
        .set({
          quantityReserved: quantity,
          updatedAt: new Date(),
        })
        .where(eq(inventoryReservations.id, existing[0].id))
        .returning();
    }

    // Create new reservation
    return db
      .insert(inventoryReservations)
      .values({
        tenantId,
        storeId,
        externalOrderId,
        productId,
        quantityReserved: quantity,
        status: 'reserved',
      })
      .returning();
  }

  /**
   * Release a reservation (when order is cancelled).
   */
  async releaseReservation(
    tenantId: string,
    externalOrderId: string,
  ) {
    return db
      .update(inventoryReservations)
      .set({
        status: 'released',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryReservations.tenantId, tenantId),
          eq(inventoryReservations.externalOrderId, externalOrderId),
        ),
      );
  }

  /**
   * Consume a reservation (when order is fulfilled).
   * Also reduces actual stock.
   */
  async consumeReservation(
    tenantId: string,
    externalOrderId: string,
  ) {
    const [reservation] = await db
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.tenantId, tenantId),
          eq(inventoryReservations.externalOrderId, externalOrderId),
        ),
      );

    if (!reservation) return null;

    // Reduce product stock
    await db
      .update(products)
      .set({
        stock: sql`stock - ${reservation.quantityReserved}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, reservation.productId));

    // Mark reservation as consumed
    await db
      .update(inventoryReservations)
      .set({
        status: 'consumed',
        updatedAt: new Date(),
      })
      .where(eq(inventoryReservations.id, reservation.id));

    return reservation;
  }

  /**
   * Push available stock to marketplace for a specific store.
   */
  async pushStockToMarketplace(
    tenantId: string,
    storeId: string,
  ) {
    const [store] = await db
      .select()
      .from(ecommerceStores)
      .where(and(eq(ecommerceStores.tenantId, tenantId), eq(ecommerceStores.id, storeId)));

    if (!store) throw new Error('Store not found');

    // Get all products with their available stock
    const productsWithStock = await db.execute(
      sql`
        SELECT
          p.id as product_id,
          p.external_id,
          p.stock,
          COALESCE(SUM(ir.quantity_reserved), 0) as reserved_qty,
          COALESCE(JSON_EXTRACT_PATH_TEXT(es.config_json, 'safetyStockBuffer')::int, 0) as safety_buffer
        FROM products p
        LEFT JOIN inventory_reservations ir ON p.id = ir.product_id AND ir.store_id = ${storeId} AND ir.status = 'reserved'
        LEFT JOIN ecommerce_stores es ON es.id = ${storeId}
        WHERE p.tenant_id = ${tenantId} AND p.is_active = true
        GROUP BY p.id, p.stock, p.external_id, es.config_json
      `,
    );

    const items = (productsWithStock.rows as any[]).map((r) => ({
      productId: r.product_id,
      externalId: r.external_id,
      available: Math.max(0, r.stock - r.safety_buffer - r.reserved_qty),
    }));

    const config = this.parseMarketplaceConfig(store.configJson);
    const payload = {
      storeId,
      platform: store.platform,
      items: items.filter((item) => Boolean(item.externalId)),
      pushedAt: new Date(),
    };

    if (!config.stockSyncEndpoint) {
      return { ...payload, status: 'pending_configuration' };
    }

    const response = await fetch(config.stockSyncEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new BadGatewayException(`Marketplace stock sync failed with status ${response.status}`);
    }

    return { ...payload, status: 'pushed' };
  }

  private parseMarketplaceConfig(configJson?: string | null): { stockSyncEndpoint?: string; apiKey?: string } {
    if (!configJson) return {};

    try {
      const parsed = JSON.parse(configJson) as { stockSyncEndpoint?: unknown; apiKey?: unknown };
      return {
        stockSyncEndpoint: typeof parsed.stockSyncEndpoint === 'string' ? parsed.stockSyncEndpoint : undefined,
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : undefined,
      };
    } catch {
      return {};
    }
  }

  /**
   * Sync all stores' stock to their marketplaces.
   */
  async syncAllStoresStock(tenantId: string) {
    const stores = await db
      .select()
      .from(ecommerceStores)
      .where(and(eq(ecommerceStores.tenantId, tenantId), eq(ecommerceStores.isActive, true)));

    const results = [];
    for (const store of stores) {
      try {
        const result = await this.pushStockToMarketplace(tenantId, store.id);
        const { status: pushStatus, ...resultDetails } = result;
        results.push({ status: 'success', pushStatus, ...resultDetails });
      } catch (err: any) {
        results.push({ status: 'error', error: err.message });
      }
    }

    return results;
  }
}
