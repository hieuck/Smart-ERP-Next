import { Injectable } from '@nestjs/common';
import { InjectDatabase } from '../../database/database.decorator';
import { Database } from '../../database/database.module';
import { syncMetadata, SyncMetadata } from '@smart-erp/database';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class SyncService {
  constructor(@InjectDatabase() private db: Database) {}

  async getMetadata(tenantId: string, clientId: string) {
    const [record] = await this.db
      .select()
      .from(syncMetadata)
      .where(and(eq(syncMetadata.tenantId, tenantId), eq(syncMetadata.clientId, clientId)));
    return record;
  }

  async updateMetadata(tenantId: string, clientId: string, vectorClock: Record<string, number>) {
    const existing = await this.getMetadata(tenantId, clientId);
    if (existing) {
      await this.db
        .update(syncMetadata)
        .set({ vectorClock, updatedAt: new Date() })
        .where(eq(syncMetadata.id, existing.id));
    } else {
      await this.db.insert(syncMetadata).values({
        tenantId,
        clientId,
        vectorClock,
      });
    }
  }

  async pull(tenantId: string, clientId: string, sinceVector: Record<string, number>) {
    // Delta sync: fetch only entities changed after the timestamp for each table
    const changes: any = {};
    const tableNames = ['products', 'orders', 'customers', 'suppliers', 'inventory_transactions'];
    for (const table of tableNames) {
      const since = sinceVector[table] || 0;
      if (since === 0) {
        // No local data yet – return full snapshot
        const rows = await this.db.select().from(sql`${sql.raw(table)}`).where(eq(sql`${sql.raw(table)}.tenant_id`, tenantId));
        changes[table] = rows;
      } else {
        const rows = await this.db.select().from(sql`${sql.raw(table)}`).where(
          and(
            eq(sql`${sql.raw(table)}.tenant_id`, tenantId),
            sql`${sql.raw(table)}.updated_at > ${new Date(since)}`
          )
        );
        changes[table] = rows;
      }
    }
    // Return a simple vector clock (last sync timestamp per table)
    const newClock: Record<string, number> = {};
    for (const table of tableNames) {
      newClock[table] = Date.now();
    }
    await this.updateMetadata(tenantId, clientId, newClock);
    return { changes, vectorClock: newClock };
  }

  async push(tenantId: string, clientId: string, changes: any) {
    // Apply incoming changes (CRDT merge). This will apply to each entity type.
    // Transactional apply per entity group.
    // For now just record metadata.
    await this.updateMetadata(tenantId, clientId, {});
    return { accepted: true };
  }
}
