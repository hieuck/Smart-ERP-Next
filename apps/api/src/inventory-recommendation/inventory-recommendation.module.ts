import { Module } from '@nestjs/common';
import { InventoryRecommendationService } from './inventory-recommendation.service';
import { InventoryRecommendationController } from './inventory-recommendation.controller';
import { ForecastModule } from '../forecast/forecast.module';
import { ActivityModule } from '../modules/activity/activity.module';

@Module({
  imports: [ForecastModule, ActivityModule],
  providers: [InventoryRecommendationService],
  controllers: [InventoryRecommendationController],
})
export class InventoryRecommendationModule {}
