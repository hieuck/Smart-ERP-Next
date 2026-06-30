import { Injectable } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { telemetryEvents } from '@smart-erp/database/schema';

@Injectable()
export class TelemetryService {
  async track(event: string, tenantId: string, userId: string, metadata: Record<string, any> = {}) {
    try {
      await db.insert(telemetryEvents).values({ event, tenantId, userId, metadata });
    } catch {
      // silently fail — don't block the app for telemetry
    }
  }

  async trackPageView(tenantId: string, userId: string, path: string) {
    await this.track('page_view', tenantId, userId, { path });
  }
}
