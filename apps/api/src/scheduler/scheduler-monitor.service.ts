import { Injectable } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { schedulerLog } from '@smart-erp/database/schema';
import { eq, desc } from '@smart-erp/database/drizzle';

@Injectable()
export class SchedulerMonitorService {
  async recordRun(jobName: string, success: boolean, durationMs: number, error?: string) {
    await db.insert(schedulerLog).values({ jobName, success, durationMs, error });
  }

  async getRecentRuns(jobName: string, limit = 10) {
    return db.select().from(schedulerLog)
      .where(eq(schedulerLog.jobName, jobName))
      .orderBy(desc(schedulerLog.createdAt))
      .limit(limit);
  }

  async getConsecutiveFailures(jobName: string, threshold = 3): Promise<boolean> {
    const recent = await db.select().from(schedulerLog)
      .where(eq(schedulerLog.jobName, jobName))
      .orderBy(desc(schedulerLog.createdAt))
      .limit(threshold);
    return recent.length >= threshold && recent.every((r) => !r.success);
  }
}
