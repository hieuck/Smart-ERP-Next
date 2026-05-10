import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { products } from '@smart-erp/database/schema';
import { eq } from 'drizzle-orm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductsService {
  async create(createProductDto: CreateProductDto) {
    const existing = await db.select().from(products).where(eq(products.sku, createProductDto.sku));
    if (existing.length > 0) {
      throw new ConflictException('SKU already exists');
    }
    const [product] = await db.insert(products).values({
      ...createProductDto,
      stock: createProductDto.stock ?? 0,
      isActive: createProductDto.isActive ?? true,
    }).returning();
    return product;
  }

  async findAll(query: QueryProductDto) {
    let sql = db.select().from(products);
    const conditions = [];

    if (query.search) {
      conditions.push(sql`(name LIKE ${`%${query.search}%`} OR sku LIKE ${`%${query.search}%`})`);
    }
    if (query.categoryId) {
      conditions.push(sql`category_id = ${query.categoryId}`);
    }
    if (query.minPrice !== undefined) {
      conditions.push(sql`price >= ${query.minPrice}`);
    }
    if (query.maxPrice !== undefined) {
      conditions.push(sql`price <= ${query.maxPrice}`);
    }
    if (query.isActive !== undefined) {
      conditions.push(sql`is_active = ${query.isActive}`);
    }

    if (conditions.length > 0) {
      sql = sql.where(sql`${conditions.join(' AND ')}`);
    }

    const total = (await sql)[0] ? (await sql).length : 0;

    const offset = (query.page - 1) * query.limit;
    const data = await sql.limit(query.limit).offset(offset);

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(id: string) {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const [product] = await db.update(products)
      .set({ ...updateProductDto, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async remove(id: string) {
    const [product] = await db.delete(products).where(eq(products.id, id)).returning();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
