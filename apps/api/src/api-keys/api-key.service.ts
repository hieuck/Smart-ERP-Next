import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, createHash, createHmac } from 'crypto';
import { db } from '@smart-erp/database';
import { apiKeys } from '@smart-erp/database/schema';
import { eq, and } from '@smart-erp/database/drizzle';

export function generateApiKey(): string {
  const token = randomBytes(12).toString('hex');
  return `smart_erp_${token}`;
}

function getHmacSecret(): string | undefined {
  return process.env.API_KEY_HMAC_SECRET;
}

function legacyHashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function hashKey(key: string): string {
  const secret = getHmacSecret();
  if (!secret) {
    Logger.warn(
      'API_KEY_HMAC_SECRET is not set; falling back to SHA256 for API key hashing. Set a strong HMAC secret in production.',
      'ApiKeyService',
    );
    return legacyHashKey(key);
  }
  return createHmac('sha512', secret).update(key).digest('hex');
}

function maskKey(key: string): string {
  const prefix = key.slice(0, 15);
  return `${prefix}${'*'.repeat(20)}`;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  maskedKey: string;
  rawKey: string;
  createdAt: Date;
}

@Injectable()
export class ApiKeyService {
  async createKey(tenantId: string, name: string, createdBy: string): Promise<ApiKeyRecord> {
    const rawKey = generateApiKey();
    const keyHash = hashKey(rawKey);

    const [keyRecord] = await db.insert(apiKeys).values({
      tenantId,
      name,
      keyHash,
      createdBy,
      isActive: true,
    }).returning();

    return {
      id: keyRecord.id,
      name,
      maskedKey: maskKey(rawKey),
      rawKey,
      createdAt: keyRecord.createdAt,
    };
  }

  async validateKey(key: string): Promise<{ tenantId: string; keyId: string } | null> {
    if (!key || !key.startsWith('smart_erp_')) return null;

    const secret = getHmacSecret();
    if (secret) {
      const hmacHash = createHmac('sha512', secret).update(key).digest('hex');
      const [hmacRecord] = await db.select().from(apiKeys).where(
        and(eq(apiKeys.keyHash, hmacHash), eq(apiKeys.isActive, true)),
      );
      if (hmacRecord) {
        await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, hmacRecord.id));
        return { tenantId: hmacRecord.tenantId, keyId: hmacRecord.id };
      }
    }

    // Legacy fallback for keys created before HMAC was introduced.
    const legacyHash = legacyHashKey(key);
    const [record] = await db.select().from(apiKeys).where(
      and(eq(apiKeys.keyHash, legacyHash), eq(apiKeys.isActive, true)),
    );
    if (record) {
      await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, record.id));
      return { tenantId: record.tenantId, keyId: record.id };
    }
    return null;
  }

  async revokeKey(tenantId: string, keyId: string) {
    await db.update(apiKeys).set({ isActive: false }).where(
      and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId)),
    );
  }

  async getUsageStats(tenantId: string, keyId: string) {
    const [record] = await db.select().from(apiKeys).where(
      and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId)),
    );
    if (!record) return null;
    return {
      id: record.id,
      name: record.name,
      isActive: record.isActive,
      createdAt: record.createdAt,
      lastUsedAt: record.lastUsedAt,
    };
  }
}

