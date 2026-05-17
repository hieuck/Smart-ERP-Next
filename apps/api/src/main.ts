import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

  // CORS configuration - allow specific origins in production
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:3000'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Smart ERP Next API')
    .setDescription('API documentation for Smart ERP Next v0.4.0')
    .setVersion('0.4.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api`);
}
bootstrap();
