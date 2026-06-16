import { Test, TestingModule } from '@nestjs/testing';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { DrizzleService } from '../../drizzle/drizzle.service';

describe('ActivityController', () => {
  it('can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [ActivityService, { provide: DrizzleService, useValue: { db: {} } }],
    }).compile();
    expect(module.get<ActivityController>(ActivityController)).toBeDefined();
  });
});
