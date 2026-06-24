import { CrmController } from './crm.controller';

describe('CrmController coverage', () => {
  const req = { user: { tenantId: 't1', sub: 'u1' } };
  const service = {
    getLeads: jest.fn(),
    createLead: jest.fn(),
    updateLeadStatus: jest.fn(),
    getPipelines: jest.fn(),
    createDeal: jest.fn(),
    updateDealStage: jest.fn(),
    convertToOrder: jest.fn(),
  };
  const ctrl = new CrmController(service as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getLeads delegates to service', () => {
    ctrl.getLeads(req);
    expect(service.getLeads).toHaveBeenCalledWith('t1');
  });

  it('createLead delegates to service', () => {
    const body = { name: 'Lead A' };
    ctrl.createLead(req, body);
    expect(service.createLead).toHaveBeenCalledWith('t1', body);
  });

  it('updateLeadStatus delegates to service', () => {
    ctrl.updateLeadStatus(req, 'lead-1', { status: 'closed' });
    expect(service.updateLeadStatus).toHaveBeenCalledWith('t1', 'lead-1', 'closed');
  });

  it('getPipelines delegates to service', () => {
    ctrl.getPipelines(req);
    expect(service.getPipelines).toHaveBeenCalledWith('t1');
  });

  it('createDeal delegates to service', () => {
    const body = { value: 5000 };
    ctrl.createDeal(req, body);
    expect(service.createDeal).toHaveBeenCalledWith('t1', body);
  });

  it('updateDealStage delegates to service', () => {
    ctrl.updateDealStage(req, 'deal-1', { stageId: 'stage-2' });
    expect(service.updateDealStage).toHaveBeenCalledWith('t1', 'deal-1', 'stage-2');
  });

  it('convertToOrder delegates to service', () => {
    ctrl.convertToOrder(req, 'deal-1');
    expect(service.convertToOrder).toHaveBeenCalledWith('t1', 'deal-1');
  });
});
