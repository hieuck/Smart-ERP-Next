import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../common/errors/error-codes';
import { db } from '@smart-erp/database';
import { employees, salaryBoards } from '@smart-erp/database/schema';
import { eq, and, ilike, or, sql } from '@smart-erp/database/drizzle';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';

@Injectable()
export class HrService {
  async createEmployee(tenantId: string, dto: CreateEmployeeDto) {
    const existing = await db
      .select()
      .from(employees)
      .where(
        and(eq(employees.tenantId, tenantId), eq(employees.code, dto.code)),
      );
    if (existing.length > 0) {
      throw new Error('Employee code already exists');
    }
    const [employee] = await db
      .insert(employees)
      .values({ ...dto, tenantId } as any)
      .returning();
    return employee;
  }

  async findAllEmployees(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
    },
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(employees.tenantId, tenantId)];

    if (query.search) {
      conditions.push(
        or(
          ilike(employees.name, `%${query.search}%`),
          ilike(employees.code, `%${query.search}%`),
          ilike(employees.email, `%${query.search}%`),
        )!,
      );
    }

    const where = and(...conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(where);

    const items = await db
      .select()
      .from(employees)
      .where(where)
      .orderBy(employees.name)
      .limit(limit)
      .offset(offset);

    return {
      items,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async findOneEmployee(tenantId: string, id: string) {
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.id, id)));
    if (!employee) throw new NotFoundException({ message: 'Employee not found', errorCode: ErrorCode.EMPLOYEE_NOT_FOUND });
    return employee;
  }

  async updateEmployee(tenantId: string, id: string, dto: UpdateEmployeeDto) {
    const [employee] = await db
      .update(employees)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.id, id)))
      .returning();
    if (!employee) throw new NotFoundException({ message: 'Employee not found', errorCode: ErrorCode.EMPLOYEE_NOT_FOUND });
    return employee;
  }

  async removeEmployee(tenantId: string, id: string) {
    const [employee] = await db
      .delete(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.id, id)))
      .returning();
    if (!employee) throw new NotFoundException({ message: 'Employee not found', errorCode: ErrorCode.EMPLOYEE_NOT_FOUND });
    return employee;
  }

  async processPayroll(tenantId: string) {
    const employeesList = await db
      .select()
      .from(employees)
      .where(eq(employees.tenantId, tenantId));

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const existing = await db
      .select()
      .from(salaryBoards)
      .where(
        and(
          eq(salaryBoards.tenantId, tenantId),
          eq(salaryBoards.month, currentMonth),
          eq(salaryBoards.year, currentYear),
        ),
      );

    if (existing.length === 0) {
      const totalNetSalary = employeesList.reduce((sum, employee) => sum + Number(employee.salary || 0), 0);
      await db.insert(salaryBoards).values({
        tenantId,
        name: `Bang luong thang ${currentMonth}/${currentYear}`,
        month: currentMonth,
        year: currentYear,
        totalEmployees: String(employeesList.length),
        totalNetSalary: String(totalNetSalary),
      } as any);
    }
  }

  async getPayrolls(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(salaryBoards)
      .where(eq(salaryBoards.tenantId, tenantId));

    const items = await db
      .select({
        id: salaryBoards.id,
        name: salaryBoards.name,
        month: salaryBoards.month,
        year: salaryBoards.year,
        status: salaryBoards.status,
        totalEmployees: salaryBoards.totalEmployees,
        totalNetSalary: salaryBoards.totalNetSalary,
      })
      .from(salaryBoards)
      .where(eq(salaryBoards.tenantId, tenantId))
      .orderBy(salaryBoards.year, salaryBoards.month)
      .limit(limit)
      .offset(offset);

    return {
      items,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }
}
