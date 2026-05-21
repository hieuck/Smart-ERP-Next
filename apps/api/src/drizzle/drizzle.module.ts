import { Global, Module } from '@nestjs/common';
import { DrizzleService } from './drizzle.service';
import { DRIZZLE } from '../common/drizzle.decorator';
import { db } from '@smart-erp/database';

@Global()
@Module({
  providers: [
    DrizzleService,
    { provide: DRIZZLE, useValue: db },
  ],
  exports: [
    DrizzleService,
    DRIZZLE,
  ],
})
export class DrizzleModule {}
