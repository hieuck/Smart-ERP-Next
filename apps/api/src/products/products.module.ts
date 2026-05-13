import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ActivityModule } from '../modules/activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
