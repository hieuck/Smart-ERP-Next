import { Module } from '@nestjs/common';
import { CrmLeadsModule } from './leads/leads.module';
import { NextBestActionController } from './next-best-action.controller';
import { NextBestActionService } from './next-best-action.service';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { DrizzleModule } from '../drizzle/drizzle.module';

@Module({
  imports: [CrmLeadsModule, DrizzleModule],
  controllers: [NextBestActionController, CrmController],
  providers: [NextBestActionService, CrmService],
  exports: [CrmLeadsModule, CrmService],
})
export class CrmModule {}