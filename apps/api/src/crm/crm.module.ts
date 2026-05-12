import { Module } from '@nestjs/common';
import { CrmLeadsModule } from './leads/leads.module';
import { NextBestActionController } from './next-best-action.controller';
import { NextBestActionService } from './next-best-action.service';

@Module({
  imports: [CrmLeadsModule],
  controllers: [NextBestActionController],
  providers: [NextBestActionService],
  exports: [CrmLeadsModule],
})
export class CrmModule {}