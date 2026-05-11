import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { db } from "@smart-erp/database";
import { customers } from "@smart-erp/database/schema";
import { eq, and, ilike, or, sql } from "@smart-erp/database/drizzle";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Injectable()
export class CustomersService {
  async create(tenantId: string, dto: CreateCustomerDto) {
    const existing = await db
      .select()
      .from(customers)
      .where(
        and(eq(customers.tenantId, tenantId), eq(customers.code, dto.code)),
      );
    if (existing.length > 0) {
      throw new ConflictException("Customer code already exists");
    }
    const [customer] = await db
      .insert(customers)
      .values({ ...dto, tenantId, debtLimit: dto.debtLimit?.toString() })
      .returning();
    return customer;
  }

  async findAll(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      group?: string;
      isActive?: boolean;
    },
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(customers.tenantId, tenantId)];

    if (query.search) {
      conditions.push(
        or(
          ilike(customers.name, `%${query.search}%`),
          ilike(customers.phone, `%${query.search}%`),
          ilike(customers.code, `%${query.search}%`),
        )!,
      );
    }
    if (query.group) {
      conditions.push(eq(customers.customerGroup, query.group));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(customers.isActive, query.isActive));
    }

    const where = and(...conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(where);

    const items = await db
      .select()
      .from(customers)
      .where(where)
      .orderBy(customers.name)
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

  async findOne(tenantId: string, id: string) {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)));
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    const values = {
      ...dto,
      debtLimit: dto.debtLimit?.toString(),
      updatedAt: new Date(),
    };

    const [customer] = await db
      .update(customers)
      .set(values)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)))
      .returning();
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  async remove(tenantId: string, id: string) {
    const [customer] = await db
      .delete(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)))
      .returning();
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }
}
