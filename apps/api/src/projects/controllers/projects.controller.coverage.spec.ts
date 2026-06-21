import { ProjectsController } from './projects.controller';

describe('ProjectsController coverage', () => {
  const req = { user: { tenantId: 't1', sub: 'u1' } };
  const service = {
    createProject: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    submitTimesheet: jest.fn(),
    getProjectProfitability: jest.fn(),
    createTask: jest.fn(),
    getGanttData: jest.fn(),
    allocateResource: jest.fn(),
  };
  const controller = new ProjectsController(service as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates create to service.createProject', () => {
    const dto = { name: 'New Project' };
    controller.create(req, dto);
    expect(service.createProject).toHaveBeenCalledWith(req.user.tenantId, dto);
  });

  it('delegates findAll to service.findAll with page and status', () => {
    controller.findAll(req, '2', 'active');
    expect(service.findAll).toHaveBeenCalledWith(req.user.tenantId, { page: 2, status: 'active' });
  });

  it('delegates findAll to service.findAll with default page', () => {
    controller.findAll(req, undefined, undefined);
    expect(service.findAll).toHaveBeenCalledWith(req.user.tenantId, { page: undefined, status: undefined });
  });

  it('delegates findOne to service.findOne', () => {
    controller.findOne(req, 'proj-1');
    expect(service.findOne).toHaveBeenCalledWith(req.user.tenantId, 'proj-1');
  });

  it('delegates submitTimesheet to service.submitTimesheet', () => {
    const dto = { hours: 8 };
    controller.submitTimesheet(req, 'proj-1', dto);
    expect(service.submitTimesheet).toHaveBeenCalledWith(req.user.tenantId, req.user.sub, 'proj-1', dto);
  });

  it('delegates getProfitability to service.getProjectProfitability', () => {
    controller.getProfitability(req, 'proj-1');
    expect(service.getProjectProfitability).toHaveBeenCalledWith(req.user.tenantId, 'proj-1');
  });

  it('delegates createTask to service.createTask', () => {
    const dto = { title: 'Task 1' };
    controller.createTask(req, 'proj-1', dto);
    expect(service.createTask).toHaveBeenCalledWith(req.user.tenantId, 'proj-1', dto);
  });

  it('delegates getGantt to service.getGanttData', () => {
    controller.getGantt(req, 'proj-1');
    expect(service.getGanttData).toHaveBeenCalledWith(req.user.tenantId, 'proj-1');
  });

  it('delegates allocateResource to service.allocateResource', () => {
    const body = { userId: 'user-42', role: 'developer' };
    controller.allocateResource(req, 'proj-1', body);
    expect(service.allocateResource).toHaveBeenCalledWith(req.user.tenantId, 'proj-1', body.userId, body);
  });
});
