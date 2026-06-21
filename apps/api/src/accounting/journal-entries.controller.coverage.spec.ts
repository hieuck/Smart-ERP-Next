jest.mock('uuid', () => ({ v4: () => 'fixed-uuid' }));
import { JournalEntriesController } from './journal-entries.controller';

describe('JournalEntriesController', () => {
  let svc: any;
  let ctrl: JournalEntriesController;

  beforeEach(() => {
    svc = {
      create: jest.fn(),
      findAll: jest.fn(),
      getTrialBalance: jest.fn(),
      findOne: jest.fn(),
      post: jest.fn(),
      reverse: jest.fn(),
    };
    ctrl = new JournalEntriesController(svc);
  });

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  it('create delegates to service', () => {
    const dto = { description: 'test', entries: [] };
    svc.create.mockReturnValue({ id: 'je1' });
    const r = ctrl.create(req, dto);
    expect(svc.create).toHaveBeenCalledWith('t1', 'u1', dto);
    expect(r).toEqual({ id: 'je1' });
  });

  it('findAll delegates to service', () => {
    const result = { items: [], total: 0 };
    svc.findAll.mockReturnValue(result);
    const r = ctrl.findAll(req, '1', '20', 'true', '2024-01-01', '2024-12-31');
    expect(svc.findAll).toHaveBeenCalledWith('t1', {
      page: 1,
      limit: 20,
      isPosted: true,
      fromDate: new Date('2024-01-01'),
      toDate: new Date('2024-12-31'),
    });
    expect(r).toEqual(result);
  });

  it('findAll calls service with undefined filters', () => {
    svc.findAll.mockReturnValue({ items: [], total: 0 });
    ctrl.findAll(req);
    expect(svc.findAll).toHaveBeenCalledWith('t1', {
      page: undefined,
      limit: undefined,
      isPosted: false,
      fromDate: undefined,
      toDate: undefined,
    });
  });

  it('trialBalance delegates to service', () => {
    svc.getTrialBalance.mockReturnValue({ debit: 100, credit: 100 });
    const r = ctrl.trialBalance(req, '2024-01-01', '2024-12-31');
    expect(svc.getTrialBalance).toHaveBeenCalledWith('t1', new Date('2024-01-01'), new Date('2024-12-31'));
    expect(r).toEqual({ debit: 100, credit: 100 });
  });

  it('trialBalance calls service with undefined dates', () => {
    svc.getTrialBalance.mockReturnValue({});
    ctrl.trialBalance(req);
    expect(svc.getTrialBalance).toHaveBeenCalledWith('t1', undefined, undefined);
  });

  it('findOne delegates to service', () => {
    svc.findOne.mockReturnValue({ id: 'je1' });
    const r = ctrl.findOne(req, '550e8400-e29b-41d4-a716-446655440000');
    expect(svc.findOne).toHaveBeenCalledWith('t1', '550e8400-e29b-41d4-a716-446655440000');
    expect(r).toEqual({ id: 'je1' });
  });

  it('post delegates to service', () => {
    svc.post.mockReturnValue({ id: 'je1', posted: true });
    const r = ctrl.post(req, '550e8400-e29b-41d4-a716-446655440000');
    expect(svc.post).toHaveBeenCalledWith('t1', 'u1', '550e8400-e29b-41d4-a716-446655440000');
    expect(r).toEqual({ id: 'je1', posted: true });
  });

  it('reverse delegates to service', () => {
    svc.reverse.mockReturnValue({ id: 'je2' });
    const r = ctrl.reverse(req, '550e8400-e29b-41d4-a716-446655440000', { reason: 'correction' });
    expect(svc.reverse).toHaveBeenCalledWith('t1', 'u1', '550e8400-e29b-41d4-a716-446655440000', 'correction');
    expect(r).toEqual({ id: 'je2' });
  });

  it('reverse calls service with undefined reason', () => {
    svc.reverse.mockReturnValue({});
    ctrl.reverse(req, '550e8400-e29b-41d4-a716-446655440000', {});
    expect(svc.reverse).toHaveBeenCalledWith('t1', 'u1', '550e8400-e29b-41d4-a716-446655440000', undefined);
  });
});
