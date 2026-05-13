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
import { ActivityService } from "../modules/activity/activity.service";

@Injectable()
export class ProductsService {
  constructor(private activityService: ActivityService) {}

  async create(tenantId: string, dto: CreateProductDto, userId?: string) {
    const existing = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.sku, dto.sku)));
    if (existing.length > 0) {
      throw new ConflictException("SKU already exists");
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

    if (userId) {
      await this.activityService.log(tenantId, userId, 'created', 'product', product.id, {
        name: product.name,
        sku: product.sku,
      });
    }

    return product;
  }

  async findAllForExport(tenantId: string, query: QueryProductDto) {
    const conditions = [eq(products.tenantId, tenantId)];
    if (query.search) conditions.push(or(ilike(products.name, `%${query.search}%`), ilike(products.sku, `%${query.search}%`))!);
    if (query.minPrice) conditions.push(gte(products.price, query.minPrice.toString()));
    if (query.maxPrice) conditions.push(lte(products.price, query.maxPrice.toString()));
    if (query.isActive !== undefined) conditions.push(eq(products.isActive, query.isActive));
    return db.select().from(products).where(and(...conditions)).orderBy(products.name);
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

  async findOne(tenantId: string, id: string, lang?: string) {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, id)));
    if (!product) throw new NotFoundException("Product not found");
    if (lang && product.translations && product.translations[lang]) {
      product.description = product.translations[lang].description;
    }
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

  async update(tenantId: string, id: string, dto: UpdateProductDto, userId?: string) {
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

    if (userId) {
      await this.activityService.log(tenantId, userId, 'updated', 'product', id, {
        changes: Object.keys(dto),
      });
    }

    return product;
  }

  async remove(tenantId: string, id: string, userId?: string) {
    const [product] = await db
      .delete(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, id)))
      .returning();
    if (!product) throw new NotFoundException("Product not found");

    if (userId) {
      await this.activityService.log(tenantId, userId, 'deleted', 'product', id, {
        name: product.name,
        sku: product.sku,
      });
    }

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
        `Insufficient stock. Available: ${previousStock}, requested: ${quantity}`,
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

  async importFromCsv(tenantId: string, buffer: Buffer) {
    const csv = buffer.toString('utf8');
    const lines = csv.split('\n').filter(l => l.trim());
    if (lines.length < 2) throw new BadRequestException('CSV must have headers and data');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const required = ['sku', 'name', 'price'];
    for (const f of required) if (!headers.includes(f)) throw new BadRequestException(`Missing column: ${f}`);

    const results: { created: number; updated: number; errors: string[] } = { created: 0, updated: 0, errors: [] };
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = Object.fromEntries(headers.map((h, idx) => [h, values[idx]]));
      if (!row.sku) { results.errors.push(`Line ${i+1}: missing sku`); continue; }
      const exist = await this.findBySku(tenantId, row.sku).catch(() => null);
      const dto: any = {
        sku: row.sku,
        name: row.name,
        price: parseFloat(row.price),
        description: row.description,
        category: row.category,
        unit: row.unit,
        cost: row.cost ? parseFloat(row.cost) : undefined,
        stock: row.stock ? parseInt(row.stock) : 0,
        minStock: row.minstock ? parseInt(row.minstock) : 0,
        isActive: row.isactive !== 'false',
      };
      try {
        if (exist) {
          await this.update(tenantId, exist.id, dto);
          results.updated++;
        } else {
          await this.create(tenantId, dto);
          results.created++;
        }
      } catch (err: any) {
        results.errors.push(`Line ${i+1}: ${err.message}`);
      }
    }
    return results;
  }
}
