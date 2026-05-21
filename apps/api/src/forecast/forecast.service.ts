// @ts-nocheck
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import axios from 'axios';

/**
 * AI Forecasting Service - integrates with Python Prophet ML model.
 * Provides demand forecasting with confidence intervals and reorder suggestions.
 */
@Injectable()
export class ForecastService {
  private readonly aiServiceUrl: string;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject('CACHE_MANAGER') private readonly cacheManager: Cache,
  ) {
    this.aiServiceUrl = this.config?.get('AI_FORECAST_URL') || process.env.AI_FORECAST_URL || 'http://localhost:8000';
  }

  /**
   * Get monthly demand forecast for a product.
   * Uses Python AI service for ML-based predictions.
   * @param productId ID of the product
   * @returns Forecast data with predictions and confidence intervals
   */
  async getMonthlyDemand(productId: string) {
    const cacheKey = `forecast:${productId}`;
    const cached = await this.cacheManager.get<MonthlyForecastCache>(cacheKey);
    if (cached) return cached;

    try {
      // Generate historical data for AI service
      const salesHistory = this.generateSalesHistory(productId);

      const response = await axios.post(
        `${this.aiServiceUrl}/forecast`,
        {
          product_id: productId,
          sales_history: salesHistory,
          lookahead_days: 30,
        },
        { timeout: 10000 }
      );

      const result = {
        productId,
        predictions: response.data.predicted_daily_demand,
        suggestedOrder: response.data.suggested_order_quantity,
        confidenceLower: response.data.confidence_lower,
        confidenceUpper: response.data.confidence_upper,
        source: 'ai',
        lookaheadDays: 30,
        generatedAt: new Date().toISOString(),
      };

      await this.cacheManager.set(cacheKey, result, { ttl: 300 }); // 5 min cache
      return result;
    } catch (error) {
      // Fallback to simple linear growth pattern if AI service unavailable
      return this.getFallbackForecast(productId);
    }
  }

  /**
   * Generate synthetic sales history for forecasting.
   * In production, this would fetch real sales data from database.
   */
  private generateSalesHistory(productId: string): { date: string; quantity: number }[] {
    const history = [];
    const today = new Date();
    for (let i = 59; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      history.push({
        date: date.toISOString().split('T')[0],
        quantity: Math.floor(10 + Math.random() * 20),
      });
    }
    return history;
  }

  /**
   * Fallback forecast when AI service is unavailable.
   */
  private async getFallbackForecast(productId: string) {
    const base = 100;
    const result = Array.from({ length: 6 }, (_, i) => {
      const forecastDate = new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000);
      const demand = base + i * 20;

      return {
        month: forecastDate.toLocaleString('en-US', { month: 'short' }),
        date: forecastDate.toISOString().split('T')[0],
        demand,
      };
    });
    const predictions = result.map((item) => ({
      date: item.date,
      quantity: item.demand,
    }));

    return {
      productId,
      data: result,
      predictions,
      suggestedOrder: predictions[0].quantity,
      confidenceLower: predictions.map((item) => ({
        date: item.date,
        quantity: Math.max(0, Math.round(item.quantity * 0.8)),
      })),
      confidenceUpper: predictions.map((item) => ({
        date: item.date,
        quantity: Math.round(item.quantity * 1.2),
      })),
      source: 'fallback',
      lookaheadDays: 30,
      generatedAt: new Date().toISOString(),
      isFallback: true,
    };
  }
}

interface MonthlyForecastCache {
  productId: string;
  predictions: { date: string; quantity: number }[];
  suggestedOrder: number;
  confidenceLower: { date: string; quantity: number }[];
  confidenceUpper: { date: string; quantity: number }[];
  source: 'ai';
  lookaheadDays: number;
  generatedAt: string;
}
