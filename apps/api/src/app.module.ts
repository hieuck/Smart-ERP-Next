import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * Release bootstrap module.
 *
 * Keep the container entrypoint lean and deterministic so deployment health
 * checks can come up even before optional ERP feature modules are wired to
 * their backing infrastructure.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
