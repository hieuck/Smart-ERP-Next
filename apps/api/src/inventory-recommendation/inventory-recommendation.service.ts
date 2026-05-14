import { Injectable } from '@nestjs/common';
import { ForecastService } from '../forecast/forecast.service';
import { ActivityService } from '../modules/activity/activity.service';

/**
 * Service that combines inventory data with demand forecast to suggest
 * optimal reorder quantities.
 */
@Injectable()
export class InventoryRecommendationService {
  constructor(
    private readonly forecastService: ForecastService,
    private readonly activityService: ActivityService,
  ) {}

  async getRecommendation(tenantId: string, userId: string, productId: string, currentStock: number) {
    const forecast = await this.forecastService.getMonthlyDemand(productId);
    const avgDemand = forecast.slice(0, 3).reduce((sum, d) => sum + d.demand, 0) / 3;
    const suggested = Math.max(0, Math.round(avgDemand - currentStock));

    await this.activityService.log({
      tenantId,
      userId,
      action: 'created',
      entityType: 'inventory',
      entityId: productId,
      details: { type: 'reorder_suggestion', suggested, currentStock },
    });

    return { productId, suggestedReorder: suggested };
  }
}
