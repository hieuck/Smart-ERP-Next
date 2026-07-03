import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthMonitorService } from './health-monitor.service';

describe('HealthController', () => {
  it('can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthMonitorService, useValue: { getHealth: jest.fn() } },
      ],
    }).compile();
    expect(module.get<HealthController>(HealthController)).toBeDefined();
  });
});
