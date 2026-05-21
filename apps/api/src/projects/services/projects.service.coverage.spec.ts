const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
};

jest.mock('@smart-erp/database', () => ({ db: mockDb }));

jest.mock('@smart-erp/database/schema', () => ({
  projects: { tenantId: 'projects.tenantId', status: 'projects.status', createdAt: 'projects.createdAt', id: 'projects.id' },
  projectTasks: { tenantId: 'projectTasks.tenantId', projectId: 'projectTasks.projectId', createdAt: 'projectTasks.createdAt' },
  projectTimesheets: { tenantId: 'projectTimesheets.tenantId', projectId: 'projectTimesheets.projectId' },
  projectTaskDependencies: { tenantId: 'projectTaskDependencies.tenantId' },
  projectMembers: {},
}));

jest.mock('@smart-erp/database/drizzle', () => ({
  eq: jest.fn((field, value) => ({ op: 'eq', field, value })),
  and: jest.fn((...conditions) => ({ op: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ op: 'sql', strings, values })),
  desc: jest.fn((field) => ({ op: 'desc', field })),
}));

import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

const selectQueue: any[][] = [];
const returningQueue: any[][] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    offset: jest.fn(() => chain),
    then: jest.fn((onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected)),
  };
  return chain;
};

const makeInsertChain = () => {
  const chain: any = {
    values: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
  };
  return chain;
};

describe('ProjectsService coverage', () => {
  let service: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
    selectQueue.length = 0;
    returningQueue.length = 0;
    mockDb.select.mockImplementation(() => makeSelectChain(selectQueue.shift() ?? []));
    mockDb.insert.mockImplementation(() => makeInsertChain());
    service = new ProjectsService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates, lists, and finds projects with not-found handling', async () => {
    returningQueue.push([{ id: 'project-1', tenantId: 'tenant-1' }]);
    await expect(service.createProject('tenant-1', { name: 'ERP rollout' })).resolves.toEqual({ id: 'project-1', tenantId: 'tenant-1' });

    selectQueue.push([{ id: 'project-1' }], [], [], [{ id: 'project-1', name: 'ERP rollout', budget: '1000000' }]);
    await expect(service.findAll('tenant-1', { page: 2, limit: 5, status: 'active' })).resolves.toEqual({
      items: [{ id: 'project-1' }],
      page: 2,
      limit: 5,
    });
    selectQueue.push([]);
    await expect(service.findAll('tenant-1', {})).resolves.toEqual({
      items: [],
      page: 1,
      limit: 20,
    });
    await expect(service.findOne('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne('tenant-1', 'project-1')).resolves.toEqual({ id: 'project-1', name: 'ERP rollout', budget: '1000000' });
  });

  it('handles timesheets, profitability, tasks, Gantt data, and resource allocation', async () => {
    returningQueue.push(
      [{ id: 'timesheet-1' }],
      [{ id: 'task-1' }],
      [{ id: 'member-1' }],
    );
    selectQueue.push(
      [{ id: 'project-1', name: 'ERP rollout', budget: '2000000' }],
      [{ totalHours: 2 }],
      [
        { id: 'task-1', title: 'Design', createdAt: '2026-05-20', status: 'done' },
        { id: 'task-2', title: 'Build', createdAt: '2026-05-21', status: 'todo' },
      ],
      [{ id: 'dep-1', dependsOnId: 'task-1', taskId: 'task-2', type: 'finish_to_start' }],
    );

    await expect(service.submitTimesheet('tenant-1', 'user-1', 'project-1', { date: '2026-05-20', hours: 2 })).resolves.toEqual({ id: 'timesheet-1' });
    await expect(service.getProjectProfitability('tenant-1', 'project-1')).resolves.toMatchObject({
      projectId: 'project-1',
      projectName: 'ERP rollout',
      totalHours: 2,
      totalLaborCost: 1000000,
      grossProfit: 1000000,
      profitMargin: 50,
    });
    await expect(service.createTask('tenant-1', 'project-1', { title: 'Task' })).resolves.toEqual({ id: 'task-1' });
    await expect(service.getGanttData('tenant-1', 'project-1')).resolves.toEqual({
      tasks: [
        { id: 'task-1', text: 'Design', start_date: '2026-05-20', duration: 5, progress: 1 },
        { id: 'task-2', text: 'Build', start_date: '2026-05-21', duration: 5, progress: 0.5 },
      ],
      links: [{ id: 'dep-1', source: 'task-1', target: 'task-2', type: 'finish_to_start' }],
    });
    await expect(service.allocateResource('tenant-1', 'project-1', 'user-1', { role: 'dev', allocationPercentage: 50 })).resolves.toEqual({ id: 'member-1' });
  });

  it('uses default timesheet dates and zero profitability fallbacks', async () => {
    returningQueue.push([{ id: 'timesheet-default' }]);
    await expect(service.submitTimesheet('tenant-1', 'user-1', 'project-1', { hours: 1 })).resolves.toEqual({
      id: 'timesheet-default',
    });
    const insertValues = mockDb.insert.mock.results[0].value.values;
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ date: new Date('2026-05-21T00:00:00.000Z') }));

    selectQueue.push([{ id: 'project-zero', name: 'Zero budget' }], [{ totalHours: null }]);
    await expect(service.getProjectProfitability('tenant-1', 'project-zero')).resolves.toMatchObject({
      projectId: 'project-zero',
      projectName: 'Zero budget',
      totalHours: 0,
      totalLaborCost: 0,
      budget: 0,
      grossProfit: 0,
      profitMargin: 0,
    });
  });
});
