import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { employees, payrolls } from '@smart-erp/database/schema';
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
      .values({ ...dto, tenantId })
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

  async findOneEmployee(tenantId: string, id: number) {
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.id, id)));
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async updateEmployee(tenantId: string, id: number, dto: UpdateEmployeeDto) {
    const [employee] = await db
      .update(employees)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(employees.tenantId, tenantId), eq(employees.id, id)))
      .returning();
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async removeEmployee(tenantId: string, id: number) {
    const [employee] = await db
      .delete(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.id, id)))
      .returning();
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async processPayroll(tenantId: string) {
    const employees = await db
      .select()
      .from(employees)
      .where(eq(employees.tenantId, tenantId));

    const currentMonth = (new Date().getMonth() + 1).toString();
    const currentYear = new Date().getFullYear();

    await Promise.all(
      employees.map(async (employee) => {
        const existing = await db
          .select()
          .from(payrolls)
          .where(
            and(
              eq(payrolls.tenantId, tenantId),
              eq(payrolls.employeeId, employee.id),
              eq(payrolls.month, currentMonth),
              eq(payrolls.year, currentYear),
            ),
          );

        if (existing.length === 0) {
          await db.insert(payrolls).values({
            tenantId,
            employeeId: employee.id,
            month: currentMonth,
            year: currentYear,
            baseSalary: employee.salary,
            allowances: 0,
            deductions: 0,
            netSalary: employee.salary,
          });
        }
      }),
    );
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
      .from(payrolls)
      .where(eq(payrolls.tenantId, tenantId));

    const items = await db
      .select({
        id: payrolls.id,
        employeeId: payrolls.employeeId,
        employeeName: employees.name,
        month: payrolls.month,
        year: payrolls.year,
        baseSalary: payrolls.baseSalary,
        allowances: payrolls.allowances,
        deductions: payrolls.deductions,
        netSalary: payrolls.netSalary,
      })
      .from(payrolls)
      .innerJoin(employees, eq(payrolls.employeeId, employees.id))
      .where(eq(payrolls.tenantId, tenantId))
      .orderBy(payrolls.year, payrolls.month)
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