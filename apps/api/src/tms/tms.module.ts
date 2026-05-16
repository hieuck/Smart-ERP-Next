import { Module } from '@nestjs/common';
import { TmsService } from './tms.service';
import { TmsController } from './tms.controller';
import { DrizzleModule } from '../drizzle/drizzle.module';

@Module({
  imports: [DrizzleModule],
  controllers: [TmsController],
  providers: [TmsService],
  exports: [TmsService],
})
export class TmsModule {}
