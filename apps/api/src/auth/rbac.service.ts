import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../drizzle/drizzle.service';
import { eq, and } from 'drizzle-orm';

export type Permission =
  | 'customers.read' | 'customers.create' | 'customers.update' | 'customers.delete'
  | 'products.read' | 'products.create' | 'products.update' | 'products.delete'
  | 'orders.read' | 'orders.create' | 'orders.update' | 'orders.delete' | 'orders.approve'
  | 'inventory.read' | 'inventory.adjust' | 'inventory.transfer'
  | 'suppliers.read' | 'suppliers.create' | 'suppliers.update' | 'suppliers.delete'
  | 'payments.read' | 'payments.create' | 'payments.update'
  | 'reports.read' | 'reports.export'
  | 'settings.read' | 'settings.update'
  | 'users.read' | 'users.create' | 'users.update' | 'users.delete'
  | 'manufacturing.read' | 'manufacturing.create' | 'manufacturing.update'
  | 'analytics.read' | 'automation.read' | 'automation.manage';

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
}

const ALL_PERMISSIONS: Permission[] = [
  'customers.read', 'customers.create', 'customers.update', 'customers.delete',
  'products.read', 'products.create', 'products.update', 'products.delete',
  'orders.read', 'orders.create', 'orders.update', 'orders.delete', 'orders.approve',
  'inventory.read', 'inventory.adjust', 'inventory.transfer',
  'suppliers.read', 'suppliers.create', 'suppliers.update', 'suppliers.delete',
  'payments.read', 'payments.create', 'payments.update',
  'reports.read', 'reports.export',
  'settings.read', 'settings.update',
  'users.read', 'users.create', 'users.update', 'users.delete',
  'manufacturing.read', 'manufacturing.create', 'manufacturing.update',
  'analytics.read', 'automation.read', 'automation.manage',
];

const DEFAULT_ROLES: Record<string, Permission[]> = {
  admin: ALL_PERMISSIONS,
  manager: [
    'customers.read', 'customers.create', 'customers.update',
    'products.read', 'products.create', 'products.update',
    'orders.read', 'orders.create', 'orders.update', 'orders.approve',
    'inventory.read', 'inventory.adjust', 'inventory.transfer',
    'suppliers.read', 'suppliers.create', 'suppliers.update',
    'payments.read', 'payments.create', 'payments.update',
    'reports.read', 'reports.export',
    'settings.read',
    'manufacturing.read', 'manufacturing.create', 'manufacturing.update',
    'analytics.read', 'automation.read', 'automation.manage',
  ],
  staff: [
    'customers.read', 'customers.create',
    'products.read',
    'orders.read', 'orders.create', 'orders.update',
    'inventory.read',
    'suppliers.read',
    'payments.read', 'payments.create',
  ],
  viewer: [
    'customers.read', 'products.read', 'orders.read',
    'inventory.read', 'suppliers.read', 'payments.read',
    'reports.read',
  ],
};

@Injectable()
export class RbacService {
  constructor(private readonly drizzle: DrizzleService) {}

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
    // In production, this would query a roles table
    // For now, return default roles based on user role field
    const userRole = await this.getUserRole(tenantId, userId);
    const permissions = DEFAULT_ROLES[userRole] || DEFAULT_ROLES['viewer'];
    return [{
      id: `role-${userRole}`,
      name: userRole,
      permissions,
      isSystem: true,
    }];
  }

  /** Create custom role */
  async createRole(tenantId: string, name: string, permissions: Permission[], description?: string): Promise<Role> {
    const id = crypto.randomUUID();
    // In production, save to database
    return { id, name, description, permissions, isSystem: false };
  }

  /** Assign role to user */
  async assignRole(tenantId: string, userId: string, roleId: string): Promise<void> {
    // In production, save to user_roles table
  }

  /** Remove role from user */
  async removeRole(tenantId: string, userId: string, roleId: string): Promise<void> {
    // In production, remove from user_roles table
  }

  /** Get all available permissions */
  getAllPermissions(): { module: string; permissions: { key: Permission; label: string }[] }[] {
    return [
      {
        module: 'Customers',
        permissions: [
          { key: 'customers.read', label: 'View Customers' },
          { key: 'customers.create', label: 'Create Customers' },
          { key: 'customers.update', label: 'Edit Customers' },
          { key: 'customers.delete', label: 'Delete Customers' },
        ],
      },
      {
        module: 'Products',
        permissions: [
          { key: 'products.read', label: 'View Products' },
          { key: 'products.create', label: 'Create Products' },
          { key: 'products.update', label: 'Edit Products' },
          { key: 'products.delete', label: 'Delete Products' },
        ],
      },
      {
        module: 'Orders',
        permissions: [
          { key: 'orders.read', label: 'View Orders' },
          { key: 'orders.create', label: 'Create Orders' },
          { key: 'orders.update', label: 'Edit Orders' },
          { key: 'orders.delete', label: 'Delete Orders' },
          { key: 'orders.approve', label: 'Approve Orders' },
        ],
      },
      {
        module: 'Inventory',
        permissions: [
          { key: 'inventory.read', label: 'View Inventory' },
          { key: 'inventory.adjust', label: 'Adjust Stock' },
          { key: 'inventory.transfer', label: 'Transfer Stock' },
        ],
      },
      {
        module: 'Reports',
        permissions: [
          { key: 'reports.read', label: 'View Reports' },
          { key: 'reports.export', label: 'Export Reports' },
        ],
      },
    ];
  }

  private async getUserRole(tenantId: string, userId: string): Promise<string> {
    // Simplified: in production, query user_roles table
    return 'staff';
  }
}