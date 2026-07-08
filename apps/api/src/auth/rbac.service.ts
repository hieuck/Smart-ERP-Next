import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ErrorCode } from '../common/errors/error-codes';
import { DrizzleService } from '../drizzle/drizzle.service';
import { Permission, PERMISSIONS, DEFAULT_ROLES } from './permissions';
import { users } from '@smart-erp/database/schema';
import { eq, and } from 'drizzle-orm';

export type { Permission } from './permissions';

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
}

@Injectable()
export class RbacService {
  private tenantRoles = new Map<string, Role[]>();

  constructor(private readonly drizzle: DrizzleService) {}

  /** Get all roles for a tenant (defaults + custom) */
  async getRoles(tenantId: string): Promise<Role[]> {
    if (!this.tenantRoles.has(tenantId)) {
      return this.seedDefaultRoles(tenantId);
    }
    return this.tenantRoles.get(tenantId)!;
  }

  /** Create a custom role */
  async createRole(tenantId: string, data: { name: string; permissions: string[]; description?: string }): Promise<Role> {
    await this.getRoles(tenantId);
    const role: Role = {
      id: crypto.randomUUID(),
      name: data.name,
      permissions: data.permissions as Permission[],
      description: data.description,
      isSystem: false,
    };
    this.tenantRoles.get(tenantId)!.push(role);
    return role;
  }

  /** Update a custom role (name, permissions, description) */
  async updateRole(tenantId: string, roleId: string, data: { name?: string; permissions?: string[]; description?: string }): Promise<Role> {
    const roles = this.tenantRoles.get(tenantId) || await this.seedDefaultRoles(tenantId);
    const index = roles.findIndex((r) => r.id === roleId);
    if (index === -1) throw new NotFoundException({ message: 'Role not found', errorCode: ErrorCode.ROLE_NOT_FOUND });
    if (roles[index].isSystem) throw new ForbiddenException('Cannot modify system roles');
    roles[index] = {
      ...roles[index],
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.permissions !== undefined ? { permissions: data.permissions as Permission[] } : {}),
    };
    return roles[index];
  }

  /** Delete a custom role */
  async deleteRole(tenantId: string, roleId: string): Promise<void> {
    const roles = this.tenantRoles.get(tenantId) || await this.seedDefaultRoles(tenantId);
    const role = roles.find((r) => r.id === roleId);
    if (!role) throw new NotFoundException({ message: 'Role not found', errorCode: ErrorCode.ROLE_NOT_FOUND });
    if (role.isSystem) throw new ForbiddenException('Cannot delete system roles');
    this.tenantRoles.set(tenantId, roles.filter((r) => r.id !== roleId));
  }

  /** Seed the three default roles (admin, manager, staff) for a tenant */
  async seedDefaultRoles(tenantId: string): Promise<Role[]> {
    const roles: Role[] = Object.entries(DEFAULT_ROLES).map(([name, permissions]) => ({
      id: crypto.randomUUID(),
      name,
      permissions: permissions as Permission[],
      isSystem: true,
    }));
    this.tenantRoles.set(tenantId, roles);
    return roles;
  }

  /** Get all available permissions grouped by module */
  getPermissions(): { module: string; permissions: string[] }[] {
    return Object.entries(PERMISSIONS).map(([module, perms]) => ({
      module,
      permissions: perms.map((p) => `${module}:${p}`),
    }));
  }

  /** Check if a user has a specific permission */
  async hasPermission(tenantId: string, userId: string, permission: Permission): Promise<boolean> {
    const roles = await this.getUserRoles(tenantId, userId);
    for (const role of roles) {
      if (role.permissions.includes(permission) || (role.permissions as any[]).includes('*')) {
        return true;
      }
    }
    return false;
  }

  /** Get all permissions for a user */
  async getUserPermissions(tenantId: string, userId: string): Promise<Permission[]> {
    const roles = await this.getUserRoles(tenantId, userId);
    const permissions = new Set<Permission>();
    for (const role of roles) {
      role.permissions.forEach((p) => permissions.add(p));
    }
    return Array.from(permissions);
  }

  /** Get user roles */
  async getUserRoles(tenantId: string, userId: string): Promise<Role[]> {
    const userRole = await this.getUserRole(tenantId, userId);
    const defaultPerms = DEFAULT_ROLES[userRole] || DEFAULT_ROLES.manager;
    return [{
      id: `role-${userRole}`,
      name: userRole,
      permissions: defaultPerms as Permission[],
      isSystem: true,
    }];
  }

  /** Create custom role (legacy signature) */
  async createRoleLegacy(tenantId: string, name: string, permissions: Permission[], description?: string): Promise<Role> {
    return this.createRole(tenantId, { name, permissions, description });
  }

  /** Assign role to user */
  async assignRole(tenantId: string, userId: string, roleId: string): Promise<void> {
    // In production, save to user_roles table
  }

  /** Remove role from user */
  async removeRole(tenantId: string, userId: string, roleId: string): Promise<void> {
    // In production, remove from user_roles table
  }

  /** Get all available permissions (legacy grouped format) */
  getAllPermissions(): { module: string; permissions: { key: Permission; label: string }[] }[] {
    return [
      {
        module: 'Customers',
        permissions: [
          { key: 'customers.read' as Permission, label: 'View Customers' },
          { key: 'customers.create' as Permission, label: 'Create Customers' },
          { key: 'customers.update' as Permission, label: 'Edit Customers' },
          { key: 'customers.delete' as Permission, label: 'Delete Customers' },
        ],
      },
      {
        module: 'Products',
        permissions: [
          { key: 'products.read' as Permission, label: 'View Products' },
          { key: 'products.create' as Permission, label: 'Create Products' },
          { key: 'products.update' as Permission, label: 'Edit Products' },
          { key: 'products.delete' as Permission, label: 'Delete Products' },
        ],
      },
      {
        module: 'Orders',
        permissions: [
          { key: 'orders.read' as Permission, label: 'View Orders' },
          { key: 'orders.create' as Permission, label: 'Create Orders' },
          { key: 'orders.update' as Permission, label: 'Edit Orders' },
          { key: 'orders.delete' as Permission, label: 'Delete Orders' },
          { key: 'orders.approve' as Permission, label: 'Approve Orders' },
        ],
      },
      {
        module: 'Inventory',
        permissions: [
          { key: 'inventory.read' as Permission, label: 'View Inventory' },
          { key: 'inventory.adjust' as Permission, label: 'Adjust Stock' },
          { key: 'inventory.transfer' as Permission, label: 'Transfer Stock' },
        ],
      },
      {
        module: 'Reports',
        permissions: [
          { key: 'reports.read' as Permission, label: 'View Reports' },
          { key: 'reports.export' as Permission, label: 'Export Reports' },
        ],
      },
    ];
  }

  private async getUserRole(tenantId: string, userId: string): Promise<string> {
    const [user] = await this.drizzle.db
      .select({ role: users.role })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.id, userId)))
      .limit(1);

    return user?.role || 'staff';
  }
}