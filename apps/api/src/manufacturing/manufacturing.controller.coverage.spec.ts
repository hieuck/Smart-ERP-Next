import { ManufacturingController } from './manufacturing.controller';

describe('ManufacturingController', () => {
  let controller: ManufacturingController;
  let mockService: Record<string, jest.Mock>;

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  beforeEach(() => {
    mockService = {
      getBOM: jest.fn(),
      addBOMItem: jest.fn(),
      listProductionOrders: jest.fn(),
      createProductionOrder: jest.fn(),
      startProduction: jest.fn(),
      completeProduction: jest.fn(),
      reportProductionProgress: jest.fn(),
      getProductionOrderById: jest.fn(),
      getQCCheckpoints: jest.fn(),
      updateQCCheckpoint: jest.fn(),
      calculateProductionCost: jest.fn(),
      calculateVarianceAnalysis: jest.fn(),
      getRoutingSteps: jest.fn(),
      addRoutingStep: jest.fn(),
      removeRoutingStep: jest.fn(),
    };
    controller = new ManufacturingController(mockService as any);
  });

  it('getBOM delegates to service.getBOM', async () => {
    mockService.getBOM.mockResolvedValue('bom-result');
    const result = await controller.getBOM(req, 'pid-1');
    expect(mockService.getBOM).toHaveBeenCalledWith('pid-1', 't1');
    expect(result).toBe('bom-result');
  });

  it('addBOMItem delegates to service.addBOMItem', async () => {
    mockService.addBOMItem.mockResolvedValue('bom-item');
    const body = { productId: 'pid-1', componentProductId: 'cid-1', quantity: 5 };
    const result = await controller.addBOMItem(req, body);
    expect(mockService.addBOMItem).toHaveBeenCalledWith('t1', 'pid-1', body);
    expect(result).toBe('bom-item');
  });

  it('listOrders delegates to service.listProductionOrders', async () => {
    mockService.listProductionOrders.mockResolvedValue(['order1']);
    const result = await controller.listOrders(req, 'draft', 2);
    expect(mockService.listProductionOrders).toHaveBeenCalledWith('t1', 'draft', 20, 2);
    expect(result).toEqual(['order1']);
  });

  it('listOrders defaults page to 1 when not provided', async () => {
    mockService.listProductionOrders.mockResolvedValue([]);
    await controller.listOrders(req);
    expect(mockService.listProductionOrders).toHaveBeenCalledWith('t1', undefined, 20, 1);
  });

  it('createOrder delegates to service.createProductionOrder', async () => {
    mockService.createProductionOrder.mockResolvedValue('order');
    const body = { productId: 'pid-1', quantity: 10 };
    const result = await controller.createOrder(req, body);
    expect(mockService.createProductionOrder).toHaveBeenCalledWith('t1', 'u1', body);
    expect(result).toBe('order');
  });

  it('startOrder delegates to service.startProduction', async () => {
    mockService.startProduction.mockResolvedValue('started');
    const result = await controller.startOrder(req, 'oid-1');
    expect(mockService.startProduction).toHaveBeenCalledWith('t1', 'oid-1', 'u1');
    expect(result).toBe('started');
  });

  it('completeOrder delegates to service.completeProduction', async () => {
    mockService.completeProduction.mockResolvedValue('completed');
    const result = await controller.completeOrder(req, 'oid-1');
    expect(mockService.completeProduction).toHaveBeenCalledWith('t1', 'oid-1', 'u1');
    expect(result).toBe('completed');
  });

  it('reportProgress delegates to service.reportProductionProgress', async () => {
    mockService.reportProductionProgress.mockResolvedValue('progress');
    const body = { progress: 50 };
    const result = await controller.reportProgress(req, 'oid-1', body);
    expect(mockService.reportProductionProgress).toHaveBeenCalledWith('t1', 'oid-1', body);
    expect(result).toBe('progress');
  });

  it('getOrder delegates to service.getProductionOrderById', async () => {
    mockService.getProductionOrderById.mockResolvedValue('order-detail');
    const result = await controller.getOrder(req, 'oid-1');
    expect(mockService.getProductionOrderById).toHaveBeenCalledWith('t1', 'oid-1');
    expect(result).toBe('order-detail');
  });

  it('getQCCheckpoints delegates to service.getQCCheckpoints', async () => {
    mockService.getQCCheckpoints.mockResolvedValue(['checkpoint']);
    const result = await controller.getQCCheckpoints(req, 'oid-1');
    expect(mockService.getQCCheckpoints).toHaveBeenCalledWith('oid-1', 't1');
    expect(result).toEqual(['checkpoint']);
  });

  it('updateQCCheckpoint delegates to service.updateQCCheckpoint', async () => {
    mockService.updateQCCheckpoint.mockResolvedValue('updated');
    const body = { status: 'passed' as const, notes: 'all good' };
    const result = await controller.updateQCCheckpoint(req, 'oid-1', 'cp-1', body);
    expect(mockService.updateQCCheckpoint).toHaveBeenCalledWith('oid-1', 'cp-1', 'passed', 'all good');
    expect(result).toBe('updated');
  });

  it('calculateCost delegates to service.calculateProductionCost', async () => {
    mockService.calculateProductionCost.mockResolvedValue('cost');
    const result = await controller.calculateCost(req, 'pid-1', '5');
    expect(mockService.calculateProductionCost).toHaveBeenCalledWith('t1', 'pid-1', 5);
    expect(result).toBe('cost');
  });

  it('calculateVariance delegates to service.calculateVarianceAnalysis', async () => {
    mockService.calculateVarianceAnalysis.mockResolvedValue('variance');
    const result = await controller.calculateVariance(req, 'oid-1');
    expect(mockService.calculateVarianceAnalysis).toHaveBeenCalledWith('t1', 'oid-1');
    expect(result).toBe('variance');
  });

  it('getRouting delegates to service.getRoutingSteps', async () => {
    mockService.getRoutingSteps.mockResolvedValue(['step']);
    const result = await controller.getRouting(req, 'pid-1');
    expect(mockService.getRoutingSteps).toHaveBeenCalledWith('pid-1', 't1');
    expect(result).toEqual(['step']);
  });

  it('addRoutingStep delegates to service.addRoutingStep', async () => {
    mockService.addRoutingStep.mockResolvedValue('step');
    const body = { productId: 'pid-1', operationName: 'op1', sequenceOrder: 1, cycleTimeMinutes: 10 };
    const result = await controller.addRoutingStep(req, body);
    expect(mockService.addRoutingStep).toHaveBeenCalledWith('t1', body);
    expect(result).toBe('step');
  });

  it('removeRoutingStep delegates to service.removeRoutingStep', async () => {
    mockService.removeRoutingStep.mockResolvedValue('removed');
    const result = await controller.removeRoutingStep(req, 'sid-1');
    expect(mockService.removeRoutingStep).toHaveBeenCalledWith('t1', 'sid-1');
    expect(result).toBe('removed');
  });
});
