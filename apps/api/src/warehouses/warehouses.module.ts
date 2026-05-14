import { Module } from '@nestjs/common';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';
import { WarehouseTransferService } from './warehouse-transfer.service';
import { WarehouseTransferController } from './warehouse-transfer.controller';
import { WarehouseMetricsService } from './warehouse-metrics.service';

@Module({
  controllers: [WarehousesController, WarehouseTransferController],
  providers: [WarehousesService, WarehouseTransferService, WarehouseMetricsService],
  exports: [WarehousesService, WarehouseTransferService, WarehouseMetricsService],
})
export class WarehousesModule {}
