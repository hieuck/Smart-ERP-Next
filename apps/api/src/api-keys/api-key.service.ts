import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, createHmac } from 'crypto';
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

function hashKey(key: string): string {
  const secret = getHmacSecret();
  if (!secret) {
    throw new Error(
      'API_KEY_HMAC_SECRET is not set; API key hashing requires a strong HMAC secret.',
    );
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
    if (!secret) {
      throw new Error(
        'API_KEY_HMAC_SECRET is not set; API key validation requires a strong HMAC secret.',
      );
    }

    const hmacHash = createHmac('sha512', secret).update(key).digest('hex');
    const [record] = await db.select().from(apiKeys).where(
      and(eq(apiKeys.keyHash, hmacHash), eq(apiKeys.isActive, true)),
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

