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
  async findAll(tenantId: string, search?: string) {
    const conditions = [eq(users.tenantId, tenantId)];

    if (search) {
      conditions.push(
        or(
          ilike(users.email, `%${search}%`),
          ilike(users.name, `%${search}%`),
        )!,
      );
    }

    return db
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
      .where(and(...conditions))
      .orderBy(users.createdAt);
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
