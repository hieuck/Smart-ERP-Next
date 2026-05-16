import { Module } from '@nestjs/common';
import { HrController } from './controllers/hr.controller';
import { HrService } from './services/hr.service';
import { AttendanceController } from './controllers/attendance.controller';
import { AttendanceService } from './services/attendance.service';
import { ActivityModule } from '../modules/activity/activity.module';
import { DrizzleModule } from '../drizzle/drizzle.module';

@Module({
  imports: [ActivityModule, DrizzleModule],
  controllers: [HrController, AttendanceController],
  providers: [HrService, AttendanceService],
  exports: [HrService, AttendanceService],
})
export class HrModule {}