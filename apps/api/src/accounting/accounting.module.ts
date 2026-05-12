import { Module } from '@nestjs/common';
import { ChartOfAccountsController } from './chart-of-accounts.controller';
import { JournalEntriesController } from './journal-entries.controller';
import { AccountingController } from './accounting.controller';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { JournalEntriesService } from './journal-entries.service';
import { AccountingService } from './accounting.service';

@Module({
  controllers: [
    ChartOfAccountsController,
    JournalEntriesController,
    AccountingController,
  ],
  providers: [ChartOfAccountsService, JournalEntriesService, AccountingService],
  exports: [ChartOfAccountsService, JournalEntriesService, AccountingService],
})
export class AccountingModule {}