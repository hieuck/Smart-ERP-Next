import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DrizzleService } from '../drizzle/drizzle.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

describe('OrdersController', () => {
  it('can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        OrdersService,
        { provide: DrizzleService, useValue: { db: {} } },
        { provide: NotificationsGateway, useValue: { sendNotification: jest.fn() } },
      ],
    }).compile();
    expect(module.get<OrdersController>(OrdersController)).toBeDefined();
  });
});
