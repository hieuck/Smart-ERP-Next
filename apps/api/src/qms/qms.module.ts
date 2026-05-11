import { Module } from '@nestjs/common';
import { QmsController } from './qms.controller';
import { QmsService } from './qms.service';

@Module({
  controllers: [QmsController],
  providers: [QmsService],
  exports: [QmsService],
})
export class QmsModule {}