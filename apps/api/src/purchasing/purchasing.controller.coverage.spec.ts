import { PurchasingController } from './purchasing.controller';

describe('PurchasingController', () => {
  let controller: PurchasingController;
  let mockService: Record<string, jest.Mock>;

  const req = { user: { tenantId: 't1', sub: 'u1' } };

  beforeEach(() => {
    mockService = {
      create: jest.fn(),
      createFromReorderSuggestions: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      confirm: jest.fn(),
      receive: jest.fn(),
      cancel: jest.fn(),
    };
    controller = new PurchasingController(mockService as any);
  });

  it('create delegates to service.create', async () => {
    mockService.create.mockResolvedValue('po');
    const dto = { supplierId: 's1', items: [{ productId: 'p1', orderedQty: 5, unitCost: 10 }] };
    const result = await controller.create(req, dto);
    expect(mockService.create).toHaveBeenCalledWith('t1', 'u1', dto);
    expect(result).toBe('po');
  });

  it('createFromReorderSuggestions delegates to service.createFromReorderSuggestions', async () => {
    mockService.createFromReorderSuggestions.mockResolvedValue('po');
    const dto = { supplierId: 's1', items: [{ productId: 'p1', quantity: 5 }] };
    const result = await controller.createFromReorderSuggestions(req, dto);
    expect(mockService.createFromReorderSuggestions).toHaveBeenCalledWith('t1', 'u1', dto);
    expect(result).toBe('po');
  });

  it('findAll delegates to service.findAll with parsed pagination', async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    const result = await controller.findAll(req, '2', '10', 'search-term', 'open');
    expect(mockService.findAll).toHaveBeenCalledWith('t1', {
      page: 2,
      limit: 10,
      search: 'search-term',
      status: 'open',
    });
    expect(result).toEqual({ data: [], total: 0 });
  });

  it('findAll passes undefined when page/limit not provided', async () => {
    mockService.findAll.mockResolvedValue([]);
    await controller.findAll(req);
    expect(mockService.findAll).toHaveBeenCalledWith('t1', {
      page: undefined,
      limit: undefined,
      search: undefined,
      status: undefined,
    });
  });

  it('findOne delegates to service.findOne', async () => {
    mockService.findOne.mockResolvedValue('po-detail');
    const result = await controller.findOne(req, 'po-uuid');
    expect(mockService.findOne).toHaveBeenCalledWith('t1', 'po-uuid');
    expect(result).toBe('po-detail');
  });

  it('confirm delegates to service.confirm', async () => {
    mockService.confirm.mockResolvedValue('confirmed');
    const result = await controller.confirm(req, 'po-uuid');
    expect(mockService.confirm).toHaveBeenCalledWith('t1', 'po-uuid');
    expect(result).toBe('confirmed');
  });

  it('receive delegates to service.receive', async () => {
    mockService.receive.mockResolvedValue('received');
    const body = { items: [{ itemId: 'i1', receivedQty: 5 }] };
    const result = await controller.receive(req, 'po-uuid', body);
    expect(mockService.receive).toHaveBeenCalledWith('t1', 'po-uuid', 'u1', body.items);
    expect(result).toBe('received');
  });

  it('cancel delegates to service.cancel', async () => {
    mockService.cancel.mockResolvedValue('cancelled');
    const result = await controller.cancel(req, 'po-uuid');
    expect(mockService.cancel).toHaveBeenCalledWith('t1', 'po-uuid');
    expect(result).toBe('cancelled');
  });
});
