import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class ReportsService {
  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
  ) {}

  async getUserRegistrationsByDay(days: number = 7) {
    const users = await this.usersService.findAll();
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const filtered = users.filter(u => u.createdAt >= startDate);
    const grouped = new Map<string, number>();

    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().slice(0,10);
      grouped.set(key, 0);
    }

    for (const user of filtered) {
      const key = user.createdAt.toISOString().slice(0,10);
      grouped.set(key, (grouped.get(key) || 0) + 1);
    }

    return Array.from(grouped.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a,b) => a.date.localeCompare(b.date));
  }

  async getTenantStats() {
    const tenants = await this.tenantsService.findAll();
    const users = await this.usersService.findAll();
    const usersByTenant = new Map<string, number>();
    for (const user of users) {
      usersByTenant.set(user.tenantId, (usersByTenant.get(user.tenantId) || 0) + 1);
    }
    return tenants.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      userCount: usersByTenant.get(t.id) || 0,
      createdAt: t.createdAt,
    }));
  }
}