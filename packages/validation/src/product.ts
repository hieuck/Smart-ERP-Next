import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm không được để trống'),
  sku: z.string().min(1, 'Mã SKU không được để trống'),
  price: z.number().positive('Giá phải lớn hơn 0'),
  cost: z.number().nonnegative('Giá vốn không được âm').optional(),
  stock: z.number().int().nonnegative('Tồn kho không được âm').default(0),
  description: z.string().optional().nullable(),
  categoryId: z.string().uuid('ID danh mục không hợp lệ').optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
