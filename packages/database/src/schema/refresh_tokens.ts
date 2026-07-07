import { pgTable, uuid, text, timestamp, boolean, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { tenants } from './tenants';

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    token: text('token').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    revoked: boolean('revoked').notNull().default(false),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tokenUnique: unique('refresh_tokens_token_unique').on(table.token),
    userIdx: index('refresh_tokens_user_idx').on(table.userId),
    tenantIdx: index('refresh_tokens_tenant_idx').on(table.tenantId),
    expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),
  })
);

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
