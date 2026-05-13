import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { LotsController } from './lots.controller';
import { LotsService } from './lots.service';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  controllers: [InventoryController, LotsController, TransfersController],
  providers: [InventoryService, LotsService, TransfersService],
  exports: [InventoryService, LotsService, TransfersService],
})
export class InventoryModule {}
