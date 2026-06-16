import { Test, TestingModule } from '@nestjs/testing';
import { AiCopilotController } from './ai-copilot.controller';
import { AiCopilotService } from './ai-copilot.service';
import { DrizzleService } from '../drizzle/drizzle.service';

describe('AiCopilotController', () => {
  it('can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiCopilotController],
      providers: [AiCopilotService, { provide: DrizzleService, useValue: { db: {} } }],
    }).compile();
    expect(module.get<AiCopilotController>(AiCopilotController)).toBeDefined();
  });
});
