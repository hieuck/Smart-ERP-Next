import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from './common/logger/logger.module';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { RateLimitHeadersInterceptor } from './common/interceptors/rate-limit-headers.interceptor';
import { SlowQueryLoggerInterceptor } from './common/interceptors/slow-query-logger.interceptor';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { RequestTimeoutMiddleware } from './common/middleware/request-timeout.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { DefaultApiVersionMiddleware } from './common/middleware/default-api-version.middleware';
import { db } from '@smart-erp/database';
import { DRIZZLE } from './common/drizzle.decorator';
import { I18nModule } from './i18n/i18n.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CommerceModule } from './modules/commerce.module';
import { CoreModule } from './modules/core.module';
import { FinanceModule } from './modules/finance.module';
import { HrModule } from './hr/hr.module';
import { InfraModule } from './modules/infra.module';
import { ManufacturingModule } from './manufacturing/manufacturing.module';
import { MRPModule } from './mrp/mrp.module';
import { QmsModule } from './qms/qms.module';
import { ProjectsModule } from './projects/projects.module';
import { CrmModule } from './crm/crm.module';
import { ForecastModule } from './forecast/forecast.module';
import { InventoryRecommendationModule } from './inventory-recommendation/inventory-recommendation.module';
import { ExportModule } from './exports/export.module';

@Module({
  imports: [
    LoggerModule,
    ThrottlerModule.forRoot([{ name: 'global', ttl: 60000, limit: parseInt(process.env.GLOBAL_RATE_LIMIT || '200', 10) }]),
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    I18nModule,
    // Domain modules
    CoreModule,
    CommerceModule,
    FinanceModule,
    InfraModule,
    AnalyticsModule,
    HrModule,
    ManufacturingModule,
    MRPModule,
    QmsModule,
    ProjectsModule,
    CrmModule,
    ForecastModule,
    InventoryRecommendationModule,
    ExportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: DRIZZLE, useValue: db },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: RateLimitHeadersInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SlowQueryLoggerInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(DefaultApiVersionMiddleware, RequestIdMiddleware, RequestTimeoutMiddleware, TenantMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
