import { ActivityService } from './activity.service';

describe('ActivityService', () => {
  let service: ActivityService;

  beforeEach(() => {
    const mockDb = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 'log-1', tenantId: 't1', action: 'created' }]),
    };
    service = new ActivityService({ db: mockDb } as any);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('log inserts and returns record', async () => {
    const result = await service.log('t1', 'u1', 'created', 'product', 'p1');
    expect(result).toBeDefined();
    expect(result.id).toBe('log-1');
  });
});
