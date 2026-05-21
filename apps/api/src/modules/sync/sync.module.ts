import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { DatabaseModule } from '../../database/database.module';
import { BenchmarkService } from '../metrics/benchmark.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SyncController],
  providers: [SyncService, BenchmarkService],
  exports: [SyncService, BenchmarkService],
})
export class SyncModule {}