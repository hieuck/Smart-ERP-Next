import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { SearchModule } from '../search/search.module';
import { AutomationModule } from '../automation/automation.module';
import { SyncModule } from './sync/sync.module';
import { SocketModule } from '../socket/socket.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { ImportModule } from '../import/import.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { PrintModule } from '../print/print.module';
import { CustomerPortalModule } from '../customers/customer-portal.module';

@Module({
  imports: [
    SettingsModule, WebhooksModule, SearchModule,
    AutomationModule, SyncModule, SocketModule,
    SchedulerModule, ImportModule, OnboardingModule,
    PrintModule, CustomerPortalModule,
  ],
  exports: [
    SettingsModule, WebhooksModule, SearchModule,
    AutomationModule, SyncModule, SocketModule,
    SchedulerModule, ImportModule, OnboardingModule,
    PrintModule, CustomerPortalModule,
  ],
})
export class InfraModule {}
