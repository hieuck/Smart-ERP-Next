import { z } from 'zod';

const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid('ID sản phẩm không hợp lệ'),
  quantity: z.number().int().positive('Số lượng phải lớn hơn 0'),
  unitPrice: z.number().nonnegative('Đơn giá không được âm'),
  discountAmount: z.number().nonnegative().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid('ID nhà cung cấp không hợp lệ'),
  warehouseId: z.string().uuid('ID kho không hợp lệ'),
  expectedDate: z.string().date('Ngày dự kiến không hợp lệ').optional(),
  shippingAddress: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1, 'Đơn nhập phải có ít nhất 1 sản phẩm'),
});

export const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial();

export const purchaseOrderQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  supplierId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  status: z.enum(['draft', 'confirmed', 'received', 'cancelled']).optional(),
  search: z.string().optional(),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type PurchaseOrderQueryInput = z.infer<typeof purchaseOrderQuerySchema>;
export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemSchema>;