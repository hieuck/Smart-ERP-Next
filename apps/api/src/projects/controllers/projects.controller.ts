import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, ParseUUIDPipe, ValidationPipe } from '@nestjs/common';
import { ProjectsService } from '../services/projects.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AllocateResourceDto, CreateProjectDto, CreateProjectTaskDto, SubmitTimesheetDto } from '../dto/project.dto';

@ApiTags('Project Management')
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @ApiOperation({ summary: 'Create a new project' })
  @Post()
  create(@Request() req: any, @Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(req.user.tenantId, dto);
  }

  @ApiOperation({ summary: 'List all projects' })
  @Get()
  findAll(@Request() req: any, @Query('page') page?: string, @Query('status') status?: string) {
    return this.projectsService.findAll(req.user.tenantId, { 
      page: page ? parseInt(page) : undefined, 
      status 
    });
  }

  @ApiOperation({ summary: 'Get project details' })
  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findOne(req.user.tenantId, id);
  }

  @ApiOperation({ summary: 'Submit a timesheet entry for a project' })
  @Post(':id/timesheets')
  submitTimesheet(@Request() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SubmitTimesheetDto) {
    return this.projectsService.submitTimesheet(req.user.tenantId, req.user.sub, id, dto);
  }

  @ApiOperation({ summary: 'Get project profitability and labor cost analysis' })
  @Get(':id/profitability')
  getProfitability(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getProjectProfitability(req.user.tenantId, id);
  }

  @ApiOperation({ summary: 'Create a task within a project' })
  @Post(':id/tasks')
  createTask(@Request() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateProjectTaskDto) {
    return this.projectsService.createTask(req.user.tenantId, id, dto);
  }

  @ApiOperation({ summary: 'Get project data for Gantt chart' })
  @Get(':id/gantt')
  getGantt(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getGanttData(req.user.tenantId, id);
  }

  @ApiOperation({ summary: 'Allocate a resource to a project' })
  @Post(':id/resources')
  allocateResource(@Request() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: AllocateResourceDto) {
    return this.projectsService.allocateResource(req.user.tenantId, id, body.userId, body);
  }
}