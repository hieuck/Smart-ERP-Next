import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { db } from '@smart-erp/database';
import { users } from '@smart-erp/database/schema';
import { eq } from 'drizzle-orm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const [user] = await db.insert(users).values({
      email: createUserDto.email,
      name: createUserDto.name,
      tenantId: createUserDto.tenantId,
      // Note: passwordHash will be added separately by auth service
    } as any).returning();

    return user;
  }

  async findAll(tenantId?: string) {
    if (tenantId) {
      return await db.select().from(users).where(eq(users.tenantId, tenantId));
    }
    // If no tenant filter, return all (admin/superuser)
    return await db.select().from(users);
  }

  async findOne(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const [user] = await db.update(users)
      .set({ ...updateUserDto, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async remove(id: string) {
    const [user] = await db.delete(users).where(eq(users.id, id)).returning();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
