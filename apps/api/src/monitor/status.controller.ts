import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../api-keys/api-key.guard';
import { StatusService } from './status.service';

@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  async getStatus() {
    return this.statusService.getSystemStatus();
  }

  @Get('metrics')
  @UseGuards(ApiKeyGuard)
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async getMetrics() {
    return this.statusService.getPrometheusMetrics();
  }
}
