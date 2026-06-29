import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { ForecastModule } from './forecast/forecast.module';
import { InventoryRecommendationModule } from './inventory-recommendation/inventory-recommendation.module';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from './common/logger/logger.module';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { InsightsModule } from './insights/insights.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { db } from '@smart-erp/database';
import { DRIZZLE } from './common/drizzle.decorator';
import { I18nModule } from './i18n/i18n.module';
import { HealthModule } from './health/health.module';
import { StatusModule } from './monitor/status.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { AccountingModule } from './accounting/accounting.module';
import { HrModule } from './hr/hr.module';
import { FixedAssetsModule } from './fixed-assets/fixed-assets.module';
import { ProjectsModule } from './projects/projects.module';
import { CrmModule } from './crm/crm.module';
import { CommentsModule } from './comments/comments.module';
import { ChatModule } from './chat/chat.module';
import { ManufacturingModule } from './manufacturing/manufacturing.module';
import { MRPModule } from './mrp/mrp.module';
import { QmsModule } from './qms/qms.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ActivityModule } from './modules/activity/activity.module';
import { ExportPdfModule } from './export-pdf/export-pdf.module';
import { CommerceModule } from './modules/commerce.module';
import { InfraModule } from './modules/infra.module';

@Module({
  imports: [
    LoggerModule,
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    I18nModule,
    CacheModule.register({ isGlobal: true, ttl: 60, max: 100 }),
    // Forecast feature
    ForecastModule,
    // Inventory recommendation
    InventoryRecommendationModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    NotificationsModule,
    ReportsModule,
    InsightsModule,
    CommerceModule,
    InfraModule,
    HealthModule,
    ApprovalsModule,
    AccountingModule,
    HrModule,
    FixedAssetsModule,
    ProjectsModule,
    CrmModule,
    CommentsModule,
    ChatModule,
    ManufacturingModule,
    MRPModule,
    QmsModule,
    AnalyticsModule,
    ActivityModule,
    ExportPdfModule,
    StatusModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: DRIZZLE, useValue: db },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
