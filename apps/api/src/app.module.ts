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
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { InventoryModule } from './inventory/inventory.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { PaymentsModule } from './payments/payments.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { HealthModule } from './health/health.module';
import { CommentsModule } from './comments/comments.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AccountingModule } from './accounting/accounting.module';
import { HrModule } from './hr/hr.module';
import { FixedAssetsModule } from './fixed-assets/fixed-assets.module';
import { ProjectsModule } from './projects/projects.module';
import { CrmModule } from './crm/crm.module';
import { ActivityModule } from './modules/activity/activity.module';
import { SyncModule } from './modules/sync/sync.module';
import { ExportModule } from './exports/export.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SearchModule } from './search/search.module';
import { AutomationModule } from './automation/automation.module';
import { ExchangeRateModule } from './currencies/exchange-rate.module';
import { ManufacturingModule } from './manufacturing/manufacturing.module';
import { MRPModule } from './mrp/mrp.module';
import { QmsModule } from './qms/qms.module';
import { AnalyticsDashboardModule } from './analytics-dashboard/analytics-dashboard.module';
import { EInvoiceModule } from './e-invoice/e-invoice.module';
import { CustomerPortalModule } from './customers/customer-portal.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SettingsModule } from './settings/settings.module';
import { ChatModule } from './chat/chat.module';
import { SocketModule } from './socket/socket.module';
import { EcommerceModule } from './ecommerce/ecommerce.module';
import { AiCopilotModule } from './ai-copilot/ai-copilot.module';
import { PrintModule } from './print/print.module';
import { ExportPdfModule } from './export-pdf/export-pdf.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { db } from '@smart-erp/database';
import { DRIZZLE } from './common/drizzle.decorator';
import { I18nModule } from './i18n/i18n.module';
import { ImportModule } from './import/import.module';
import { OnboardingModule } from './onboarding/onboarding.module';

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
    ProductsModule,
    CustomersModule,
    OrdersModule,
    SuppliersModule,
    InventoryModule,
    ExchangeRateModule,
    CurrenciesModule,
    ApprovalsModule,
    PurchasingModule,
    PaymentsModule,
    WarehousesModule,
    CommentsModule,
    SchedulerModule,
    AccountingModule,
    HrModule,
    FixedAssetsModule,
    ProjectsModule,
    CrmModule,
    ActivityModule,
    SyncModule,
    HealthModule,
    ExportModule,
    WebhooksModule,
    AutomationModule,
    SearchModule,
    ManufacturingModule,
    MRPModule,
    QmsModule,
    AnalyticsDashboardModule,
    CustomerPortalModule,
    EInvoiceModule,
    AnalyticsModule,
    ChatModule,
    SettingsModule,
    SocketModule,
    EcommerceModule,
    AiCopilotModule,
    PrintModule,
    ExportPdfModule,
    ImportModule,
    OnboardingModule,
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
