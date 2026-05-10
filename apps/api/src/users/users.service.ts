import {
  Injectable, ConflictException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { db } from '@smart-erp/database';
import { users } from '@smart-erp/database/schema';
import { eq, and, ilike, or, sql } from 'drizzle-orm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  async create(createUserDto: CreateUserDto) {
    const existing = await this.findByEmail(createUserDto.email);
    if (existing) throw new ConflictException('Email đã được sử dụng');

    const [user] = await db
      .insert(users)
      .values({
        email: createUserDto.email,
        name: createUserDto.name ?? null,
        tenantId: createUserDto.tenantId,
        passwordHash: (createUserDto as any).passwordHash ?? null,
        role: (createUserDto as any).role ?? 'user',
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
          ilike(users.name, `%${search}%`)
        )!
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

    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    const [user] = await db
      .update(users)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(users.tenantId, tenantId), eq(users.id, id)))
      .returning();

    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  async remove(tenantId: string, id: string) {
    const [user] = await db
      .delete(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.id, id)))
      .returning();

    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  async getStats(tenantId: string) {
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    const byRole = await db.execute(
      sql`SELECT role, count(*)::int AS count FROM users WHERE tenant_id = ${tenantId} GROUP BY role`
    );

    return {
      total,
      byRole: (byRole.rows as any[]).reduce(
        (acc, r) => ({ ...acc, [r.role]: r.count }),
        {} as Record<string, number>
      ),
    };
  }
}
