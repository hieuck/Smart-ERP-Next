import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { ActivityService } from '../modules/activity/activity.service';
import { DrizzleService } from '../drizzle/drizzle.service';

describe('CustomersController', () => {
  it('can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        CustomersService,
        { provide: ActivityService, useValue: { log: jest.fn() } },
        { provide: DrizzleService, useValue: { db: {} } },
      ],
    }).compile();
    expect(module.get<CustomersController>(CustomersController)).toBeDefined();
  });
});
