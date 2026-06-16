import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

const mockGateway = { sendNotification: jest.fn() };

describe('CommentsService', () => {
  let service: CommentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommentsService, { provide: NotificationsGateway, useValue: mockGateway }],
    }).compile();
    service = module.get<CommentsService>(CommentsService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });
});
