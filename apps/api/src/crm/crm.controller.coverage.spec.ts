import { CrmController } from './crm.controller';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateLeadStatusDto, UpdateDealStageDto, CreateDealDto } from './dto/crm.dto';

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
    ctrl.updateLeadStatus(req, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', { status: 'contacted' } as any);
    expect(service.updateLeadStatus).toHaveBeenCalledWith('t1', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'contacted');
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
    ctrl.updateDealStage(req, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', { stageId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' } as any);
    expect(service.updateDealStage).toHaveBeenCalledWith('t1', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');
  });

  it('convertToOrder delegates to service', () => {
    ctrl.convertToOrder(req, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(service.convertToOrder).toHaveBeenCalledWith('t1', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
  });

  describe('DTO validation', () => {
    it('UpdateLeadStatusDto rejects invalid status values', async () => {
      const dto = plainToInstance(UpdateLeadStatusDto, { status: 'closed' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('UpdateDealStageDto rejects non-UUID stageId', async () => {
      const dto = plainToInstance(UpdateDealStageDto, { stageId: 'not-a-uuid' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('CreateDealDto rejects non-UUID leadId', async () => {
      const dto = plainToInstance(CreateDealDto, { title: 'Deal A', leadId: 'invalid' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'leadId')).toBe(true);
    });
  });
});
