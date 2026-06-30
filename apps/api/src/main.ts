import 'reflect-metadata';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { setupSwagger } from './swagger-setup';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ResponseFormatInterceptor } from './common/interceptors/response-format.interceptor';
import { GlobalExceptionFilter } from './common/filters';
import { API_VERSIONING_CONFIG } from './common/api-versioning';
let APP_VERSION = '0.0.0';
try {
  APP_VERSION = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf-8')).version || '0.0.0';
} catch { /* fallback */ }

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['error', 'warn', 'log'] });

  // CSRF is NOT needed — API uses JWT Bearer tokens (stateless auth).
  // CSRF only applies to cookie/session-based authentication.

  // CORS configuration - allow specific origins in production
  const configuredCorsOrigins = process.env.CORS_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const corsOrigins = configuredCorsOrigins?.length ? configuredCorsOrigins : [
    'http://localhost:3457',
    'http://localhost:3467',
    'http://localhost:3456',
    'http://localhost:3001',
    'http://localhost:3000',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true
  });
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  }));
  app.enableVersioning(API_VERSIONING_CONFIG);
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new ResponseFormatInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  setupSwagger(app, APP_VERSION);

  const port = process.env.PORT ?? 3000;
  
  app.enableShutdownHooks();
  
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger docs: http://localhost:${port}/api`);
  }
}
bootstrap();
