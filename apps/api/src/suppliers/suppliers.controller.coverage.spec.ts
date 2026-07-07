import { SuppliersController } from './suppliers.controller';
import { PaginationParamsDto } from '../common/dto/pagination-params.dto';

describe('SuppliersController', () => {
  let svc: any;
  let ctrl: SuppliersController;

  beforeEach(() => {
    svc = { create: jest.fn(), findAll: jest.fn(), findOne: jest.fn(), update: jest.fn(), remove: jest.fn() };
    ctrl = new SuppliersController(svc);
  });

  const req = { user: { tenantId: 't1' } };

  it('create delegates to service', async () => {
    svc.create.mockResolvedValue({ id: 's1' });
    const dto = { name: 'ABC Supplies' } as any;
    const r = await ctrl.create(req, dto);
    expect(svc.create).toHaveBeenCalledWith('t1', dto);
    expect(r).toEqual({ id: 's1' });
  });

  it('findAll delegates to service', async () => {
    svc.findAll.mockResolvedValue({ items: [], total: 0 });
    const pagination: PaginationParamsDto = { page: 1, limit: 20 };
    await ctrl.findAll(req, pagination, 'search', 'true');
    expect(svc.findAll).toHaveBeenCalledWith('t1', { page: 1, limit: 20, search: 'search', isActive: true });
  });

  it('findOne delegates to service', async () => {
    svc.findOne.mockResolvedValue({ id: 's1' });
    const r = await ctrl.findOne(req, 's1');
    expect(svc.findOne).toHaveBeenCalledWith('t1', 's1');
    expect(r).toEqual({ id: 's1' });
  });

  it('update delegates to service', async () => {
    svc.update.mockResolvedValue({ id: 's1' });
    const dto = { name: 'Updated' } as any;
    await ctrl.update(req, 's1', dto);
    expect(svc.update).toHaveBeenCalledWith('t1', 's1', dto);
  });

  it('remove delegates to service', async () => {
    svc.remove.mockResolvedValue({ id: 's1' });
    const r = await ctrl.remove(req, 's1');
    expect(svc.remove).toHaveBeenCalledWith('t1', 's1');
    expect(r).toEqual({ id: 's1' });
  });
});
