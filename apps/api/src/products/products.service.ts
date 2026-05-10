import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { products } from '@smart-erp/database/schema';
import { eq } from 'drizzle-orm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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

  async findAll() {
    return await db.select().from(products);
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
