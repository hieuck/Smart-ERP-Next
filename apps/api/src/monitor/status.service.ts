import { Injectable } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { sql } from '@smart-erp/database/drizzle';

@Injectable()
export class StatusService {
  private readonly startTime = Date.now();

  async getSystemStatus() {
    let dbStatus = 'healthy';
    try {
      await db.execute(sql`SELECT 1`);
    } catch {
      dbStatus = 'unhealthy';
    }

    return {
      version: process.env.npm_package_version || '0.0.0',
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      dbStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
