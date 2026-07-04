import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DrizzleService } from '../drizzle/drizzle.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { ActivityService } from '../modules/activity/activity.service';
import { TelemetryService } from '../analytics/telemetry.service';

describe('OrdersController', () => {
  it('can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        OrdersService,
        { provide: DrizzleService, useValue: { db: {} } },
        { provide: NotificationsGateway, useValue: { sendNotification: jest.fn() } },
        { provide: ActivityService, useValue: { log: jest.fn() } },
        { provide: TelemetryService, useValue: { track: jest.fn() } },
      ],
    }).compile();
    expect(module.get<OrdersController>(OrdersController)).toBeDefined();
  });
});
