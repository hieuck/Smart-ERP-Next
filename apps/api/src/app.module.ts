import { Module, NestModule, MiddlewareConsumer, RequestMethod, CacheModule } from '@nestjs/common';
import { ForecastModule } from './forecast/forecast.module';
import { InventoryRecommendationModule } from './inventory-recommendation/inventory-recommendation.module';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
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
import { LoyaltyModule } from './loyalty/loyalty.module';
import { FixedAssetsModule } from './fixed-assets/fixed-assets.module';
import { ProjectsModule } from './projects/projects.module';
import { HelpdeskModule } from './helpdesk/helpdesk.module';
import { CrmModule } from './crm/crm.module';
import { ActivityModule } from './modules/activity/activity.module';
import { ExportModule } from './exports/export.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SearchModule } from './search/search.module';
import { AutomationModule } from './automation/automation.module';
import { ExchangeRateModule } from './currencies/exchange-rate.module';
import { ManufacturingModule } from './manufacturing/manufacturing.module';
import { MRPModule } from './mrp/mrp.module';
import { QmsModule } from './qms/qms.module';
import { CustomerPortalModule } from './customers/customer-portal.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { db } from '@smart-erp/database';
import { DRIZZLE } from './common/drizzle.decorator';

@Module({
  imports: [
    // Cache layer for performance
    CacheModule.register({ isGlobal: true, ttl: 60, max: 100 }),
    // Forecast feature
    ForecastModule,
    // Inventory recommendation
    InventoryRecommendationModule,
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
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
    CurrenciesModule,
    ApprovalsModule,
    PurchasingModule,
    PaymentsModule,
    WarehousesModule,
    CommentsModule,
    SchedulerModule,
    AccountingModule,
    HrModule,
    LoyaltyModule,
    FixedAssetsModule,
    ProjectsModule,
    HelpdeskModule,
    CrmModule,
    ActivityModule,
    HealthModule,
    ExportModule,
    WebhooksModule,
    AutomationModule,
    SearchModule,
    ExchangeRateModule,
    ManufacturingModule,
    MRPModule,
    QmsModule,
    CustomerPortalModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: DRIZZLE, useValue: db },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
