import { Test, TestingModule } from '@nestjs/testing';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { DrizzleService } from '../drizzle/drizzle.service';

describe('AutomationController', () => {
  it('can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutomationController],
      providers: [AutomationService, { provide: DrizzleService, useValue: { db: {} } }],
    }).compile();
    const controller = module.get<AutomationController>(AutomationController);
    expect(controller).toBeDefined();
  });
});
