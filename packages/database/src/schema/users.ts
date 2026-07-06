import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatar: text('avatar'),
  phone: text('phone'),
  preferences: jsonb('preferences').$type<{ theme?: 'light' | 'dark'; language?: string }>(),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('user'), // 'admin', 'manager', 'user'
  isActive: boolean('is_active').notNull().default(true),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
