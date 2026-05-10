import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
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
import { PurchasingModule } from './purchasing/purchasing.module';
import { PaymentsModule } from './payments/payments.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { db } from '@smart-erp/database';
import { DRIZZLE } from './common/drizzle.decorator';

@Module({
  imports: [
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
    PurchasingModule,
    PaymentsModule,
    WarehousesModule,
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
