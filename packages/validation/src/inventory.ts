import { z } from 'zod';

const LOT_STATUSES = ['active', 'depleted', 'expired'] as const;

export const createLotSchema = z.object({
  productId: z.string().uuid('ID sản phẩm không hợp lệ'),
  lotNumber: z.string().min(1, 'Số lô không được để trống').max(50),
  expiryDate: z.string().date('Ngày hết hạn không hợp lệ').optional().nullable(),
  quantity: z.number().int('Số lượng phải là số nguyên').positive('Số lượng phải lớn hơn 0'),
  warehouseId: z.string().uuid('ID kho không hợp lệ').optional().nullable(),
  receivedDate: z.string().date('Ngày nhận không hợp lệ').optional(),
});

export const updateLotSchema = createLotSchema.partial();

export const lotQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  includeExpired: z.boolean().optional(),
});

export type CreateLotInput = z.infer<typeof createLotSchema>;
export type UpdateLotInput = z.infer<typeof updateLotSchema>;
export type LotQueryInput = z.infer<typeof lotQuerySchema>;