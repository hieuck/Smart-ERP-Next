import { Injectable } from '@nestjs/common';
import { InjectDatabase } from '../../database/database.decorator';
import { Database } from '../../database/database.module';
import { syncBenchmarks } from '@smart-erp/database';
import { and, eq, sql, desc } from 'drizzle-orm';

@Injectable()
export class BenchmarkService {
  constructor(@InjectDatabase() private db: Database) {}

  async record(tenantId: string, clientId: string, endpoint: string, status: string, durationMs: number, changesCount = 0, sizeBytes = 0) {
    await this.db.insert(syncBenchmarks).values({
      tenantId,
      clientId,
      endpoint,
      status,
      durationMs,
      changesCount,
      sizeBytes,
    });
  }

  async getStats(tenantId: string, hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const results = await this.db
      .select({
        endpoint: syncBenchmarks.endpoint,
        status: syncBenchmarks.status,
        p95: sql<number>`percentile_cont(0.95) WITHIN GROUP (ORDER BY ${syncBenchmarks.durationMs})`,
        p99: sql<number>`percentile_cont(0.99) WITHIN GROUP (ORDER BY ${syncBenchmarks.durationMs})`,
        avg: sql<number>`avg(${syncBenchmarks.durationMs})`,
        count: sql<number>`count(*)`,
      })
      .from(syncBenchmarks)
      .where(
        and(
          eq(syncBenchmarks.tenantId, tenantId),
          sql`${syncBenchmarks.createdAt} >= ${cutoff}`,
        ),
      )
      .groupBy(syncBenchmarks.endpoint, syncBenchmarks.status);

    const recentEvents = await this.db
      .select()
      .from(syncBenchmarks)
      .where(eq(syncBenchmarks.tenantId, tenantId))
      .orderBy(desc(syncBenchmarks.createdAt))
      .limit(50);

    return { stats: results, recentEvents };
  }
}
