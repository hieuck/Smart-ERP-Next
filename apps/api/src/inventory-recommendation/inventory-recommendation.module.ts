import { Module } from '@nestjs/common';
import { InventoryRecommendationService } from './inventory-recommendation.service';
import { InventoryRecommendationController } from './inventory-recommendation.controller';
import { ForecastModule } from '../forecast/forecast.module';

@Module({
  imports: [ForecastModule],
  providers: [InventoryRecommendationService],
  controllers: [InventoryRecommendationController],
})
export class InventoryRecommendationModule {}
