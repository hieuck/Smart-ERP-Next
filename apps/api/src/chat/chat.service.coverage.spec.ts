import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

const mockGateway = { sendNotification: jest.fn() };

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatService, { provide: NotificationsGateway, useValue: mockGateway }],
    }).compile();
    service = module.get<ChatService>(ChatService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });
});
