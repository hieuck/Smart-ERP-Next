import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { db } from '@smart-erp/database';
import { apiKeys } from '@smart-erp/database/schema';
import { eq, and } from '@smart-erp/database/drizzle';

export function generateApiKey(): string {
  const token = randomBytes(12).toString('hex');
  return `smart_erp_${token}`;
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
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
    const keyHash = hashKey(key);
    const [record] = await db.select().from(apiKeys).where(
      and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)),
    );
    return record ? { tenantId: record.tenantId, keyId: record.id } : null;
  }

  async revokeKey(tenantId: string, keyId: string) {
    await db.update(apiKeys).set({ isActive: false }).where(
      and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId)),
    );
  }
}

