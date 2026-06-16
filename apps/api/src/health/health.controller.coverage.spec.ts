import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [],
    }).compile();
    expect(module.get<HealthController>(HealthController)).toBeDefined();
  });
});
