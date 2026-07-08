import { ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ProjectsController } from './projects.controller';
import {
  CreateProjectDto,
  CreateProjectTaskDto,
  SubmitTimesheetDto,
  AllocateResourceDto,
} from '../dto/project.dto';

describe('ProjectsController', () => {
  const mockService = {
    createProject: jest.fn().mockResolvedValue({ id: 'p-1' }),
    findAll: jest.fn().mockResolvedValue({ items: [], page: 1, limit: 20 }),
    findOne: jest.fn().mockResolvedValue({ id: 'p-1' }),
    submitTimesheet: jest.fn().mockResolvedValue({ id: 'ts-1' }),
    getProjectProfitability: jest.fn().mockResolvedValue({}),
    createTask: jest.fn().mockResolvedValue({ id: 't-1' }),
    getGanttData: jest.fn().mockResolvedValue({ tasks: [], links: [] }),
    allocateResource: jest.fn().mockResolvedValue({ id: 'm-1' }),
  };
  const controller = new ProjectsController(mockService as any);
  const req = { user: { tenantId: 'tenant-1', sub: 'user-1' } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ParseUUIDPipe on :id parameters', () => {
    const pipe = new ParseUUIDPipe();

    it('rejects a non-UUID project id', async () => {
      await expect(
        pipe.transform('not-a-uuid', { type: 'param', metatype: String, data: 'id' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a valid UUID project id', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      await expect(
        pipe.transform(uuid, { type: 'param', metatype: String, data: 'id' }),
      ).resolves.toBe(uuid);
    });
  });

  describe('DTO validation', () => {
    function extractErrors(errors: ValidationError[]): string[] {
      return errors.flatMap(e => Object.values(e.constraints || {}));
    }

    it('CreateProjectDto requires a name', async () => {
      const dto = plainToInstance(CreateProjectDto, {});
      const errors = extractErrors(await validate(dto));
      expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('name')]));
    });

    it('SubmitTimesheetDto rejects negative hours', async () => {
      const dto = plainToInstance(SubmitTimesheetDto, { date: '2026-07-08', hours: -1 });
      const errors = extractErrors(await validate(dto));
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/hours/)]));
    });

    it('AllocateResourceDto rejects out-of-range allocation', async () => {
      const dto = plainToInstance(AllocateResourceDto, {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        role: 'dev',
        allocationPercentage: 150,
      });
      const errors = extractErrors(await validate(dto));
      expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/allocationPercentage/)]));
    });

    it('CreateProjectTaskDto accepts valid input', async () => {
      const dto = plainToInstance(CreateProjectTaskDto, { title: 'Task 1' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Controller method behavior', () => {
    it('findOne calls service with tenantId and parsed id', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      await controller.findOne(req as any, uuid);
      expect(mockService.findOne).toHaveBeenCalledWith('tenant-1', uuid);
    });

    it('submitTimesheet passes tenantId, userId, projectId and dto', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const dto: SubmitTimesheetDto = { date: '2026-07-08', hours: 4, description: 'work' };
      await controller.submitTimesheet(req as any, uuid, dto);
      expect(mockService.submitTimesheet).toHaveBeenCalledWith('tenant-1', 'user-1', uuid, dto);
    });

    it('createTask passes tenantId, projectId and dto', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const dto: CreateProjectTaskDto = { title: 'Task 1' };
      await controller.createTask(req as any, uuid, dto);
      expect(mockService.createTask).toHaveBeenCalledWith('tenant-1', uuid, dto);
    });

    it('allocateResource passes tenantId, projectId, userId and dto', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const body: AllocateResourceDto = {
        userId: '660e8400-e29b-41d4-a716-446655440000',
        role: 'developer',
        allocationPercentage: 50,
      };
      await controller.allocateResource(req as any, uuid, body);
      expect(mockService.allocateResource).toHaveBeenCalledWith('tenant-1', uuid, body.userId, body);
    });
  });
});
