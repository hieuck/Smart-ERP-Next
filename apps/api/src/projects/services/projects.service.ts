import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-codes';
import { db } from '@smart-erp/database';
import { projects, projectTasks, projectTimesheets, projectTaskDependencies, projectMembers } from '@smart-erp/database/schema';
import { eq, and, sql, desc } from '@smart-erp/database/drizzle';

@Injectable()
export class ProjectsService {
  async createProject(tenantId: string, dto: any) {
    const [project] = await db
      .insert(projects)
      .values({ ...dto, tenantId })
      .returning();
    return project;
  }

  async findAll(tenantId: string, query: { page?: number; limit?: number; status?: string }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(projects.tenantId, tenantId)];
    if (query.status) conditions.push(eq(projects.status, query.status as any));

    const where = and(...conditions);

    const items = await db
      .select()
      .from(projects)
      .where(where)
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset);

    return { items, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.tenantId, tenantId), eq(projects.id, id)));

    if (!project) throw new NotFoundException({ message: 'Project not found', errorCode: ErrorCode.PROJECT_NOT_FOUND });
    return project;
  }

  async submitTimesheet(tenantId: string, userId: string, projectId: string, data: any) {
    const [entry] = await db
      .insert(projectTimesheets)
      .values({
        ...data,
        tenantId,
        projectId,
        userId,
        date: new Date(data.date || new Date()),
      })
      .returning();
    return entry;
  }

  /**
   * Advanced Analysis: Project Profitability
   * Compares project budget/revenue against labor costs (hours * internal rate)
   */
  async getProjectProfitability(tenantId: string, projectId: string) {
    const project = await this.findOne(tenantId, projectId);
    
    // Sum all hours for this project
    const [{ totalHours }] = await db
      .select({ totalHours: sql<number>`SUM(hours)::float` })
      .from(projectTimesheets)
      .where(and(eq(projectTimesheets.tenantId, tenantId), eq(projectTimesheets.projectId, projectId)));

    const averageLaborRate = 500000; // 500k VND/hour internal cost (should be from HR)
    const totalLaborCost = (totalHours || 0) * averageLaborRate;
    const budget = parseFloat(project.budget || '0');
    
    return {
      projectId,
      projectName: project.name,
      totalHours: totalHours || 0,
      totalLaborCost,
      budget,
      grossProfit: budget - totalLaborCost,
      profitMargin: budget > 0 ? ((budget - totalLaborCost) / budget) * 100 : 0,
      updatedAt: new Date(),
    };
  }

  async createTask(tenantId: string, projectId: string, data: any) {
    const [task] = await db
      .insert(projectTasks)
      .values({
        ...data,
        tenantId,
        projectId,
      })
      .returning();
    return task;
  }

  /**
   * Get data structured for Gantt charts
   */
  async getGanttData(tenantId: string, projectId: string) {
    const tasks = await db
      .select()
      .from(projectTasks)
      .where(and(eq(projectTasks.tenantId, tenantId), eq(projectTasks.projectId, projectId)))
      .orderBy(projectTasks.createdAt);

    const dependencies = await db
      .select()
      .from(projectTaskDependencies)
      .where(eq(projectTaskDependencies.tenantId, tenantId));

    return {
      tasks: tasks.map(t => ({
        id: t.id,
        text: t.title,
        start_date: t.createdAt,
        duration: 5, // Default or calculated
        progress: t.status === 'done' ? 1 : 0.5,
      })),
      links: dependencies.map(d => ({
        id: d.id,
        source: d.dependsOnId,
        target: d.taskId,
        type: d.type,
      }))
    };
  }

  /**
   * Allocate a member to a project
   */
  async allocateResource(tenantId: string, projectId: string, userId: string, data: { role: string; allocationPercentage: number }) {
    const [member] = await db
      .insert(projectMembers)
      .values({
        tenantId,
        projectId,
        userId,
        role: data.role,
        allocationPercentage: data.allocationPercentage,
      })
      .returning();
    return member;
  }
}