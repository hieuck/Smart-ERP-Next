import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnomalyService } from './anomaly.service';
import { CashflowForecastService } from './cashflow-forecast.service';
import { CashflowController } from './cashflow.controller';
import { ClvService } from './clv.service';
import { ClvController } from './clv.controller';
import { ChurnPredictionService } from './churn.service';
import { ChurnController } from './churn.controller';
import { PredictiveAnalyticsService } from './predictive-analytics.service';
import { PredictiveAnalyticsController } from './predictive-analytics.controller';

@Module({
  providers: [
    AnalyticsService,
    AnomalyService,
    CashflowForecastService,
    ClvService,
    ChurnPredictionService,
    PredictiveAnalyticsService,
  ],
  controllers: [
    AnalyticsController,
    CashflowController,
    ClvController,
    ChurnController,
    PredictiveAnalyticsController,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}