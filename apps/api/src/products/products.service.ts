import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { ErrorCode } from "../common/errors/error-codes";
import { db } from "@smart-erp/database";
import { products, inventoryTransactions, productCategories } from "@smart-erp/database/schema";
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
    const sku = await this.resolveSku(tenantId, dto.sku, dto.name);
    const category = await this.resolveCategory(tenantId, dto.categoryId, dto.category);

    const [product] = await db
      .insert(products)
      .values({
        ...dto,
        tenantId,
        sku,
        categoryId: category.categoryId,
        category: category.category,
        imageUrl: this.cleanOptionalText(dto.imageUrl),
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
    if (query.categoryId) conditions.push(eq(products.categoryId, query.categoryId));
    if (query.category) conditions.push(ilike(products.category, `%${query.category}%`));
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
    if (query.categoryId) {
      conditions.push(eq(products.categoryId, query.categoryId));
    }
    if (query.category) {
      conditions.push(ilike(products.category, `%${query.category}%`));
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

  async findCategories(tenantId: string) {
    const items = await db
      .select()
      .from(productCategories)
      .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.isActive, true)))
      .orderBy(productCategories.sortOrder, productCategories.name);

    const legacy = await db.execute(sql`
      SELECT DISTINCT category as name
      FROM products
      WHERE tenant_id = ${tenantId}
        AND category IS NOT NULL
        AND category <> ''
      ORDER BY category
    `);

    return {
      items,
      legacy: legacy.rows,
    };
  }

  async findOne(tenantId: string, id: string, lang?: string) {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, id)));
    if (!product) throw new NotFoundException({ message: "Product not found", errorCode: ErrorCode.PRODUCT_NOT_FOUND });
    const prod = product as any;
    if (lang && prod.translations && prod.translations[lang]) {
      product.description = prod.translations[lang].description;
    }
    return product;
  }

  async findBySku(tenantId: string, sku: string) {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.sku, sku)));
    if (!product) throw new NotFoundException({ message: "Product not found", errorCode: ErrorCode.PRODUCT_NOT_FOUND });
    return product;
  }

  async findByBarcode(tenantId: string, barcode: string) {
    return this.findBySku(tenantId, barcode);
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto, userId?: string) {
    const { sku, categoryId, category: categoryName, imageUrl, ...rest } = dto;
    const category =
      categoryId !== undefined || categoryName !== undefined
        ? await this.resolveCategory(tenantId, categoryId, categoryName)
        : undefined;
    const values = {
      ...rest,
      ...(this.cleanOptionalText(sku) ? { sku: await this.resolveSku(tenantId, sku, rest.name ?? "ITEM", id) } : {}),
      ...(category ? { categoryId: category.categoryId, category: category.category } : {}),
      ...(imageUrl !== undefined ? { imageUrl: this.cleanOptionalText(imageUrl) } : {}),
      price: dto.price?.toString(),
      cost: dto.cost?.toString(),
      updatedAt: new Date(),
    };

    const [product] = await db
      .update(products)
      .set(values)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, id)))
      .returning();
    if (!product) throw new NotFoundException({ message: "Product not found", errorCode: ErrorCode.PRODUCT_NOT_FOUND });

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
    if (!product) throw new NotFoundException({ message: "Product not found", errorCode: ErrorCode.PRODUCT_NOT_FOUND });

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
      throw new ConflictException({ message: `Insufficient stock. Available: ${previousStock}, requested: ${quantity}`, errorCode: ErrorCode.INVENTORY_INSUFFICIENT });
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

    if (createdBy) {
      await this.activityService.log(tenantId, createdBy, 'stock_adjusted', 'product', id, {
        type,
        quantity,
        previousStock,
        newStock,
        reference,
        notes,
      });
    }

    return updated;
  }

  async importFromCsv(tenantId: string, buffer: Buffer) {
    const csv = buffer.toString('utf8');
    const rows = ProductsService.parseCsv(csv);
    if (rows.length < 2) throw new BadRequestException('CSV must have headers and data');

    const headers = rows[0].map(h => h.trim().toLowerCase());
    const required = ['sku', 'name', 'price'];
    for (const f of required) if (!headers.includes(f)) throw new BadRequestException(`Missing column: ${f}`);

    const results: { created: number; updated: number; errors: string[] } = { created: 0, updated: 0, errors: [] };
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
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

  async getTransactions(tenantId: string, productId: string) {
    return db
      .select()
      .from(inventoryTransactions)
      .where(and(eq(inventoryTransactions.tenantId, tenantId), eq(inventoryTransactions.productId, productId)))
      .orderBy(desc(inventoryTransactions.createdAt));
  }

  private static parseCsv(csv: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < csv.length; i++) {
      const char = csv[i];
      const nextChar = csv[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentField);
        currentField = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (currentRow.length > 0 || currentField.length > 0) {
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
        }
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        currentField += char;
      }
    }

    if (currentRow.length > 0 || currentField.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }

    return rows;
  }

  private cleanOptionalText(value?: string | null) {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private async resolveSku(tenantId: string, requestedSku: string | undefined, name: string, currentProductId?: string) {
    const normalized = this.cleanOptionalText(requestedSku)?.toUpperCase();
    if (normalized) {
      const [existing] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.sku, normalized));
      if (existing && existing.id !== currentProductId) {
        throw new ConflictException("SKU already exists");
      }
      return normalized;
    }

    const seed = this.toSkuSegment(name) || "ITEM";
    const tenantSegment = tenantId.replace(/-/g, "").slice(0, 6).toUpperCase();
    const dateSegment = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const prefix = `${seed}-${tenantSegment}-${dateSegment}`;

    for (let index = 1; index <= 9999; index += 1) {
      const sku = `${prefix}-${index.toString().padStart(4, "0")}`;
      const [existing] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.sku, sku));
      if (!existing) return sku;
    }

    throw new ConflictException("Unable to generate a unique SKU");
  }

  private toSkuSegment(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 12)
      .toUpperCase();
  }

  private async resolveCategory(tenantId: string, categoryId?: string, category?: string) {
    if (categoryId) {
      const [found] = await db
        .select({ id: productCategories.id, name: productCategories.name })
        .from(productCategories)
        .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.id, categoryId)));
      if (!found) {
        throw new BadRequestException("Product category not found");
      }
      return { categoryId: found.id, category: found.name };
    }

    return {
      categoryId: null,
      category: this.cleanOptionalText(category),
    };
  }
}
