import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { db } from '@smart-erp/database';
import { products, activityLogs, tenants } from '@smart-erp/database/schema';
import { and, eq, lt, sql } from '@smart-erp/database/drizzle';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Running daily scheduled tasks...');
    await this.checkLowStock();
    await this.cleanupOldLogs();
  }

  async checkLowStock() {
    const tenantRows = await db.select({ id: tenants.id }).from(tenants);
    let checked = 0;

    for (const tenant of tenantRows) {
      const lowStock = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.tenantId, tenant.id),
            sql`${products.stock} <= ${products.minStock} AND ${products.isActive} = true`,
          ),
        );
      checked += lowStock.length;
      this.logger.log(
        `Low stock check for tenant ${tenant.id}: ${lowStock.length} products below minimum`,
      );
    }

    this.logger.log(`Low stock check total: ${checked} products below minimum`);
    return { checked };
  }

  async cleanupOldLogs() {
    const tenantRows = await db.select({ id: tenants.id }).from(tenants);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    let deleted = 0;

    for (const tenant of tenantRows) {
      const result = await db
        .delete(activityLogs)
        .where(
          and(
            eq(activityLogs.tenantId, tenant.id),
            lt(activityLogs.createdAt, ninetyDaysAgo),
          ),
        );
      deleted += result.rowCount || 0;
      this.logger.log(
        `Cleaned up ${result.rowCount || 0} old activity logs for tenant ${tenant.id}`,
      );
    }

    this.logger.log(`Cleaned up ${deleted} old activity logs total`);
    return { deleted };
  }
}
