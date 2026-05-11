import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { db } from "@smart-erp/database";
import { products, inventoryTransactions } from "@smart-erp/database/schema";
import {
  eq,
  and,
  ilike,
  or,
  gte,
  lte,
  sql,
  desc,
} from "@smart-erp/database/drizzle";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { QueryProductDto } from "./dto/query-product.dto";

@Injectable()
export class ProductsService {
  async create(tenantId: string, dto: CreateProductDto) {
    const existing = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.sku, dto.sku)));
    if (existing.length > 0) {
      throw new ConflictException("Mã SKU đã tồn tại");
    }
    const [product] = await db
      .insert(products)
      .values({
        ...dto,
        tenantId,
        price: dto.price.toString(),
        cost: dto.cost?.toString(),
        stock: dto.stock ?? 0,
        isActive: dto.isActive ?? true,
      })
      .returning();
    return product;
  }

  async findAll(tenantId: string, query: QueryProductDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(products.tenantId, tenantId)];

    if (query.search) {
      conditions.push(
        or(
          ilike(products.name, `%${query.search}%`),
          ilike(products.sku, `%${query.search}%`),
        )!,
      );
    }
    if (query.minPrice !== undefined) {
      conditions.push(gte(products.price, query.minPrice.toString()));
    }
    if (query.maxPrice !== undefined) {
      conditions.push(lte(products.price, query.maxPrice.toString()));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(products.isActive, query.isActive));
    }

    const where = and(...conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(where);

    const items = await db
      .select()
      .from(products)
      .where(where)
      .orderBy(products.name)
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

  async findOne(tenantId: string, id: string) {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, id)));
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async findBySku(tenantId: string, sku: string) {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.sku, sku)));
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    const values = {
      ...dto,
      price: dto.price?.toString(),
      cost: dto.cost?.toString(),
      updatedAt: new Date(),
    };

    const [product] = await db
      .update(products)
      .set(values)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, id)))
      .returning();
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async remove(tenantId: string, id: string) {
    const [product] = await db
      .delete(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, id)))
      .returning();
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async adjustStock(
    tenantId: string,
    id: string,
    quantity: number,
    type: "IN" | "OUT" | "ADJUSTMENT",
    notes?: string,
    reference?: string,
    createdBy?: string,
  ) {
    const product = await this.findOne(tenantId, id);
    const previousStock = product.stock;
    const newStock =
      type === "OUT" ? previousStock - quantity : previousStock + quantity;

    if (newStock < 0) {
      throw new ConflictException(
        `Tồn kho không đủ. Hiện có: ${previousStock}, yêu cầu xuất: ${quantity}`,
      );
    }

    const [updated] = await db
      .update(products)
      .set({ stock: newStock, updatedAt: new Date() })
      .where(and(eq(products.tenantId, tenantId), eq(products.id, id)))
      .returning();

    // Record transaction
    await db.insert(inventoryTransactions).values({
      tenantId,
      productId: id,
      type,
      quantity,
      previousStock,
      newStock,
      reference: reference ?? null,
      notes: notes ?? null,
      createdBy: createdBy ?? null,
    });

    return updated;
  }

  async getTransactions(tenantId: string, productId: string) {
    return db
      .select()
      .from(inventoryTransactions)
      .where(
        and(
          eq(inventoryTransactions.tenantId, tenantId),
          eq(inventoryTransactions.productId, productId),
        ),
      )
      .orderBy(desc(inventoryTransactions.createdAt))
      .limit(50);
  }
}
