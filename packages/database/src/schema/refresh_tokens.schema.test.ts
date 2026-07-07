import { getTableConfig } from 'drizzle-orm/pg-core';
import { refreshTokens } from './refresh_tokens';

describe('refreshTokens schema', () => {
  it('has a unique constraint on token', () => {
    const config = getTableConfig(refreshTokens);

    const tokenUnique = config.uniqueConstraints.find(
      (uc) => uc.name === 'refresh_tokens_token_unique'
    );

    expect(tokenUnique).toBeDefined();
    expect(tokenUnique!.columns.map((col) => col.name)).toEqual(['token']);
  });

  it('has foreign keys to users and tenants', () => {
    const config = getTableConfig(refreshTokens);

    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(2);
  });

  it('has indexes on user_id, tenant_id and expires_at', () => {
    const config = getTableConfig(refreshTokens);

    const indexNames = config.indexes.map((idx) => idx.config.name);
    expect(indexNames).toContain('refresh_tokens_user_idx');
    expect(indexNames).toContain('refresh_tokens_tenant_idx');
    expect(indexNames).toContain('refresh_tokens_expires_at_idx');
  });
});
