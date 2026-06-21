import { ApprovalsController } from './approvals.controller';

describe('ApprovalsController', () => {
  let rulesSvc: any;
  let approvalsSvc: any;
  let ctrl: ApprovalsController;

  beforeEach(() => {
    rulesSvc = { create: jest.fn(), findAll: jest.fn(), findOne: jest.fn(), update: jest.fn(), remove: jest.fn() };
    approvalsSvc = { submitForApproval: jest.fn(), approveStep: jest.fn(), rejectStep: jest.fn(), getRequest: jest.fn(), getPendingApprovals: jest.fn() };
    ctrl = new ApprovalsController(approvalsSvc, rulesSvc);
  });

  it('createRule delegates to rules service', async () => {
    rulesSvc.create.mockResolvedValue({ id: 'r1' });
    const dto = { name: 'Rule 1', documentType: 'purchase_order', minAmount: 0, maxAmount: 100000 } as any;
    const r = await ctrl.createRule('t1', dto);
    expect(rulesSvc.create).toHaveBeenCalledWith('t1', dto);
    expect(r).toEqual({ id: 'r1' });
  });

  it('findAllRules delegates to rules service', async () => {
    rulesSvc.findAll.mockResolvedValue([]);
    await ctrl.findAllRules('t1');
    expect(rulesSvc.findAll).toHaveBeenCalledWith('t1');
  });

  it('findOneRule delegates to rules service', async () => {
    rulesSvc.findOne.mockResolvedValue({ id: 'r1' });
    const r = await ctrl.findOneRule('t1', 'r1');
    expect(rulesSvc.findOne).toHaveBeenCalledWith('t1', 'r1');
    expect(r).toEqual({ id: 'r1' });
  });

  it('updateRule delegates to rules service', async () => {
    rulesSvc.update.mockResolvedValue({ id: 'r1' });
    const dto = { name: 'Updated' };
    await ctrl.updateRule('t1', 'r1', dto);
    expect(rulesSvc.update).toHaveBeenCalledWith('t1', 'r1', dto);
  });

  it('removeRule delegates to rules service', async () => {
    rulesSvc.remove.mockResolvedValue({ id: 'r1' });
    const r = await ctrl.removeRule('t1', 'r1');
    expect(rulesSvc.remove).toHaveBeenCalledWith('t1', 'r1');
    expect(r).toEqual({ id: 'r1' });
  });

  it('submitForApproval delegates to approvals service', async () => {
    approvalsSvc.submitForApproval.mockResolvedValue({ id: 'a1' });
    const body = { documentType: 'purchase_order', documentId: 'po1', documentAmount: 50000, approverIds: ['u1'] };
    const r = await ctrl.submitForApproval('t1', 'u1', body);
    expect(approvalsSvc.submitForApproval).toHaveBeenCalledWith('t1', 'purchase_order', 'po1', 50000, 'u1', ['u1']);
    expect(r).toEqual({ id: 'a1' });
  });

  it('approveStep delegates to approvals service', async () => {
    approvalsSvc.approveStep.mockResolvedValue({ id: 'a1', status: 'approved' });
    const r = await ctrl.approveStep('t1', 'u2', 'a1', { comments: 'OK' });
    expect(approvalsSvc.approveStep).toHaveBeenCalledWith('t1', 'a1', 'u2', 'OK');
    expect(r).toEqual({ id: 'a1', status: 'approved' });
  });

  it('rejectStep delegates to approvals service', async () => {
    approvalsSvc.rejectStep.mockResolvedValue({ id: 'a1', status: 'rejected' });
    const r = await ctrl.rejectStep('t1', 'u2', 'a1', { comments: 'No' });
    expect(approvalsSvc.rejectStep).toHaveBeenCalledWith('t1', 'a1', 'u2', 'No');
    expect(r).toEqual({ id: 'a1', status: 'rejected' });
  });

  it('getRequest delegates to approvals service', async () => {
    approvalsSvc.getRequest.mockResolvedValue({ id: 'a1' });
    const r = await ctrl.getRequest('t1', 'a1');
    expect(approvalsSvc.getRequest).toHaveBeenCalledWith('t1', 'a1');
    expect(r).toEqual({ id: 'a1' });
  });

  it('getPending delegates to approvals service', async () => {
    approvalsSvc.getPendingApprovals.mockResolvedValue([]);
    await ctrl.getPending('t1', 'u2');
    expect(approvalsSvc.getPendingApprovals).toHaveBeenCalledWith('t1', 'u2');
  });
});
