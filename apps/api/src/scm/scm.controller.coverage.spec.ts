import { ScmController } from './scm.controller';

describe('ScmController coverage', () => {
  let svc: any;
  let ctrl: ScmController;

  beforeEach(() => {
    svc = {
      listSuggestions: jest.fn(),
      generateReorderSuggestions: jest.fn(),
      approveSuggestion: jest.fn(),
    };
    ctrl = new ScmController(svc);
  });

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  it('listSuggestions delegates to service', async () => {
    svc.listSuggestions.mockResolvedValue([{ id: 's1' }]);
    const r = await ctrl.listSuggestions(req);
    expect(svc.listSuggestions).toHaveBeenCalledWith('t1');
    expect(r).toEqual([{ id: 's1' }]);
  });

  it('runEngine delegates to service', async () => {
    svc.generateReorderSuggestions.mockResolvedValue({ count: 5 });
    const r = await ctrl.runEngine(req);
    expect(svc.generateReorderSuggestions).toHaveBeenCalledWith('t1');
    expect(r).toEqual({ count: 5 });
  });

  it('approve delegates to service', async () => {
    svc.approveSuggestion.mockResolvedValue({ id: 's1', status: 'approved' });
    const r = await ctrl.approve(req, 's1');
    expect(svc.approveSuggestion).toHaveBeenCalledWith('t1', 's1');
    expect(r).toEqual({ id: 's1', status: 'approved' });
  });
});
