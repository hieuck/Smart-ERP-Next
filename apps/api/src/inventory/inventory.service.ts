import { Injectable, ConflictException } from "@nestjs/common";
import { db } from "@smart-erp/database";
import { products, inventoryTransactions } from "@smart-erp/database/schema";
import { eq, and, sql, desc, lte } from "@smart-erp/database/drizzle";

@Injectable()
export class InventoryService {
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
}
