import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { db } from '@smart-erp/database';
import { users } from '@smart-erp/database/schema';
import { eq } from 'drizzle-orm';
import { UsersService } from '../users/users.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role ?? 'user',
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        role: user.role ?? 'user',
      },
    };
  }

  async register(email: string, password: string, name?: string, tenantId?: string) {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert directly to include passwordHash (bypasses service which strips it)
    const [user] = await db
      .insert(users)
      .values({
        email,
        name: name ?? null,
        passwordHash: hashedPassword,
        tenantId: tenantId ?? null,
        role: 'user',
      })
      .returning();

    this.notificationsGateway.broadcast('user.registered', {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      timestamp: new Date().toISOString(),
    });

    return this.login(user);
  }
}
