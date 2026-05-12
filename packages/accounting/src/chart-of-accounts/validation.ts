import { z } from 'zod';

export const chartOfAccountSchema = z.object({
  accountCode: z.string().min(1).max(20),
  accountName: z.string().min(1).max(200),
  accountNameEn: z.string().max(200).optional(),
  accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  parentId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
  description: z.string().max(500).optional(),
  currency: z.string().length(3).default('VND'),
});

export const updateChartOfAccountSchema = chartOfAccountSchema.partial();

export const moveAccountSchema = z.object({
  accountId: z.string().uuid(),
  newParentId: z.string().uuid().nullable(),
  newPosition: z.number().int().min(0).optional(),
});

export type ChartOfAccountInput = z.infer<typeof chartOfAccountSchema>;
export type UpdateChartOfAccountInput = z.infer<typeof updateChartOfAccountSchema>;
export type MoveAccountInput = z.infer<typeof moveAccountSchema>;