import { Injectable } from '@nestjs/common';
import { ForecastService } from '../forecast/forecast.service';

/**
 * Service that combines inventory data with demand forecast to suggest
 * optimal reorder quantities.
 */
@Injectable()
export class InventoryRecommendationService {
  constructor(private readonly forecastService: ForecastService) {}

  async getRecommendation(productId: string, currentStock: number) {
    const forecast = await this.forecastService.getMonthlyDemand(productId);
    // Simple heuristic: average forecast demand over next 3 months minus current stock
    const avgDemand = forecast.slice(0, 3).reduce((sum, d) => sum + d.demand, 0) / 3;
    const suggested = Math.max(0, Math.round(avgDemand - currentStock));
    return { productId, suggestedReorder: suggested };
  }
}
