import { UsersController } from './users.controller';

describe('UsersController coverage', () => {
  const req = { user: { tenantId: 't1', sub: 'u1' } };
  const usersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    getStats: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateProfile: jest.fn(),
  };
  const ctrl = new UsersController(usersService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('create delegates to service', () => {
    const dto = { email: 'a@b.com' };
    ctrl.create(req, dto as any);
    expect(usersService.create).toHaveBeenCalledWith({ ...dto, tenantId: 't1' });
  });

  it('findAll delegates to service with search only', () => {
    ctrl.findAll(req, 'search-term');
    expect(usersService.findAll).toHaveBeenCalledWith('t1', {
      search: 'search-term',
      page: undefined,
      limit: undefined,
    });
  });

  it('findAll delegates to service with pagination', () => {
    ctrl.findAll(req, 'search-term', '2', '10');
    expect(usersService.findAll).toHaveBeenCalledWith('t1', {
      search: 'search-term',
      page: 2,
      limit: 10,
    });
  });

  it('findAll without search delegates to service', () => {
    ctrl.findAll(req, undefined);
    expect(usersService.findAll).toHaveBeenCalledWith('t1', {
      search: undefined,
      page: undefined,
      limit: undefined,
    });
  });

  it('getMe delegates to service', () => {
    ctrl.getMe(req);
    expect(usersService.findOne).toHaveBeenCalledWith('t1', 'u1');
  });

  it('getStats delegates to service', () => {
    ctrl.getStats(req);
    expect(usersService.getStats).toHaveBeenCalledWith('t1');
  });

  it('findOne delegates to service', () => {
    ctrl.findOne(req, 'user-1');
    expect(usersService.findOne).toHaveBeenCalledWith('t1', 'user-1');
  });

  it('update delegates to service', () => {
    const dto = { name: 'Updated' };
    ctrl.update(req, 'user-1', dto as any);
    expect(usersService.update).toHaveBeenCalledWith('t1', 'user-1', dto);
  });

  it('remove delegates to service', () => {
    ctrl.remove(req, 'user-1');
    expect(usersService.remove).toHaveBeenCalledWith('t1', 'user-1');
  });

  it('updateProfile delegates to service', async () => {
    const dto = { name: 'Profile' };
    await ctrl.updateProfile(req, dto as any);
    expect(usersService.updateProfile).toHaveBeenCalledWith('t1', 'u1', dto);
  });
});
