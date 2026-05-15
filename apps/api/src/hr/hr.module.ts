import { Module } from '@nestjs/common';
import { HrController } from './controllers/hr.controller';
import { HrService } from './services/hr.service';
import { ActivityModule } from '../modules/activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [HrController],
  providers: [HrService],
  exports: [HrService],
})
export class HrModule {}