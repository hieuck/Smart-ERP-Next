import { Controller, Get, Version } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Version('1')
  async getHealth() {
    return this.healthService.getHealth();
  }
}
