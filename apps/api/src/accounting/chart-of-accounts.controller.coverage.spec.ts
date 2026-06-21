import { ChartOfAccountsController } from './chart-of-accounts.controller';

describe('ChartOfAccountsController', () => {
  let svc: any;
  let ctrl: ChartOfAccountsController;

  beforeEach(() => {
    svc = {
      create: jest.fn(),
      findAll: jest.fn(),
      getAccountTree: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      seedDefaultAccounts: jest.fn(),
    };
    ctrl = new ChartOfAccountsController(svc);
  });

  const req = { user: { tenantId: 't1' } };

  it('create delegates to service', () => {
    const dto = { code: '1000', name: 'Cash', type: 'asset' };
    svc.create.mockReturnValue({ id: 'a1' });
    const r = ctrl.create(req, dto);
    expect(svc.create).toHaveBeenCalledWith('t1', dto);
    expect(r).toEqual({ id: 'a1' });
  });

  it('findAll delegates to service', () => {
    const result = [{ id: 'a1' }];
    svc.findAll.mockReturnValue(result);
    const r = ctrl.findAll(req, 'asset', 'true', 'cash');
    expect(svc.findAll).toHaveBeenCalledWith('t1', { type: 'asset', isActive: true, search: 'cash' });
    expect(r).toEqual(result);
  });

  it('findAll calls service with undefined filters', () => {
    svc.findAll.mockReturnValue([]);
    ctrl.findAll(req);
    expect(svc.findAll).toHaveBeenCalledWith('t1', { type: undefined, isActive: false, search: undefined });
  });

  it('getTree delegates to service', () => {
    const tree = [{ id: 'a1', children: [] }];
    svc.getAccountTree.mockReturnValue(tree);
    const r = ctrl.getTree(req);
    expect(svc.getAccountTree).toHaveBeenCalledWith('t1');
    expect(r).toEqual(tree);
  });

  it('findOne delegates to service', () => {
    svc.findOne.mockReturnValue({ id: 'a1' });
    const r = ctrl.findOne(req, '550e8400-e29b-41d4-a716-446655440000');
    expect(svc.findOne).toHaveBeenCalledWith('t1', '550e8400-e29b-41d4-a716-446655440000');
    expect(r).toEqual({ id: 'a1' });
  });

  it('update delegates to service', () => {
    const dto = { name: 'Updated' };
    svc.update.mockReturnValue({ id: 'a1' });
    const r = ctrl.update(req, '550e8400-e29b-41d4-a716-446655440000', dto);
    expect(svc.update).toHaveBeenCalledWith('t1', '550e8400-e29b-41d4-a716-446655440000', dto);
    expect(r).toEqual({ id: 'a1' });
  });

  it('delete delegates to service', () => {
    svc.delete.mockReturnValue({ success: true });
    const r = ctrl.delete(req, '550e8400-e29b-41d4-a716-446655440000');
    expect(svc.delete).toHaveBeenCalledWith('t1', '550e8400-e29b-41d4-a716-446655440000');
    expect(r).toEqual({ success: true });
  });

  it('seedDefaultAccounts delegates to service', () => {
    svc.seedDefaultAccounts.mockReturnValue({ count: 5 });
    const r = ctrl.seedDefaultAccounts(req);
    expect(svc.seedDefaultAccounts).toHaveBeenCalledWith('t1');
    expect(r).toEqual({ count: 5 });
  });
});
