import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { DrizzleService } from '../drizzle/drizzle.service';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from '../notifications/notifications.gateway';

describe('WebhooksController', () => {
  it('can be instantiated', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        WebhooksService,
        { provide: DrizzleService, useValue: { db: {} } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: NotificationsGateway, useValue: { sendNotification: jest.fn() } },
      ],
    }).compile();
    const ctrl = module.get<WebhooksController>(WebhooksController);
    expect(ctrl).toBeDefined();
  });
});
