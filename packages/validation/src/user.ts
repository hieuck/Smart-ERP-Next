import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  name: z.string().optional().nullable(),
  tenantId: z.string().uuid("Tenant ID không hợp lệ").optional(),
  role: z
    .enum(["admin", "manager", "accountant", "warehouse", "sales", "user"])
    .default("user"),
});

export const updateUserSchema = z.object({
  name: z.string().optional().nullable(),
  role: z
    .enum(["admin", "manager", "accountant", "warehouse", "sales", "user"])
    .optional(),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự").optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
