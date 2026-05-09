import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { UsersModule } from '../users/users.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [UsersModule, TenantsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}