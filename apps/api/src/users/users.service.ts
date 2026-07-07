import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { db } from "@smart-erp/database";
import { users } from "@smart-erp/database/schema";
import { eq, and, ilike, or, sql } from "@smart-erp/database/drizzle";
import * as bcrypt from "bcryptjs";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  async create(createUserDto: CreateUserDto) {
    if (!createUserDto.tenantId) {
      throw new BadRequestException("tenantId is required");
    }

    if ((createUserDto as any).passwordHash !== undefined) {
      throw new BadRequestException(
        "passwordHash is not allowed; provide password instead",
      );
    }

    const existing = await this.findByEmail(createUserDto.email);
    if (existing) throw new ConflictException("Email already in use");

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const [user] = await db
      .insert(users)
      .values({
        email: createUserDto.email,
        name: createUserDto.name ?? null,
        tenantId: createUserDto.tenantId,
        passwordHash,
        role: createUserDto.role ?? "user",
      })
      .returning();

    return user;
  }

  /** Always scoped to tenantId — never returns cross-tenant data */
  async findAll(
    tenantId: string,
    options: { search?: string; page?: number; limit?: number } = {},
  ) {
    const { search } = options;
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));

    const conditions = [eq(users.tenantId, tenantId)];

    if (search) {
      conditions.push(
        or(
          ilike(users.email, `%${search}%`),
          ilike(users.name, `%${search}%`),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause);

    const items = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        tenantId: users.tenantId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        // Never return passwordHash
      })
      .from(users)
      .where(whereClause)
      .orderBy(users.createdAt)
      .limit(limit)
      .offset((page - 1) * limit);

    const total = Number(count);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(tenantId: string, id: string) {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        tenantId: users.tenantId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.id, id)));

    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  /**
   * Look up an active user by ID and tenant. Returns `null` if the user does
   * not exist, is disabled, or does not belong to the tenant.
   */
  async findActiveByIdAndTenant(id: string, tenantId: string) {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        tenantId: users.tenantId,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId), eq(users.isActive, true)));
    return user ?? null;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    const updates = await this.buildUpdateSet(dto);

    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(users.tenantId, tenantId), eq(users.id, id)))
      .returning();

    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateProfile(tenantId: string, userId: string, dto: UpdateUserDto) {
    const updates = await this.buildUpdateSet(dto);

    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(users.tenantId, tenantId), eq(users.id, userId)))
      .returning();

    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  private async buildUpdateSet(
    dto: UpdateUserDto,
  ): Promise<Partial<Omit<UpdateUserDto, "password">>> {
    if ((dto as any).passwordHash !== undefined) {
      throw new BadRequestException(
        "passwordHash is not allowed; provide password instead",
      );
    }

    const { password, ...rest } = dto as any;

    if (password !== undefined) {
      (rest as any).passwordHash = await bcrypt.hash(password, 10);
    }

    return rest;
  }

  async remove(tenantId: string, id: string) {
    const [user] = await db
      .delete(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.id, id)))
      .returning();

    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async getStats(tenantId: string) {
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    const byRole = await db.execute(
      sql`SELECT role, count(*)::int AS count FROM users WHERE tenant_id = ${tenantId} GROUP BY role`,
    );

    return {
      total,
      byRole: (byRole.rows as any[]).reduce(
        (acc, r) => ({ ...acc, [r.role]: r.count }),
        {} as Record<string, number>,
      ),
    };
  }
}
