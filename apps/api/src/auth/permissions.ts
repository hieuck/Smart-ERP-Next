export const PERMISSIONS = {
  products: ['view', 'create', 'edit', 'delete'],
  orders: ['view', 'create', 'cancel'],
  customers: ['view', 'create', 'edit', 'delete'],
  suppliers: ['view', 'create', 'edit', 'delete'],
  inventory: ['view', 'adjust', 'transfer'],
  reports: ['view', 'export'],
  reports_profit: ['view'],
  settings: ['view', 'manage'],
  users: ['view', 'create', 'edit', 'delete'],
  roles: ['view', 'manage'],
  accounting: ['view', 'create', 'approve'],
  hr: ['view', 'manage'],
} as const;

export type Permission = `${string}:${string}`;

export const DEFAULT_ROLES: Record<string, readonly string[]> = {
  admin: Object.entries(PERMISSIONS).flatMap(([module, actions]) =>
    actions.map((action) => `${module}:${action}`),
  ),
  manager: [
    'products:view', 'products:create', 'products:edit',
    'orders:view', 'orders:create', 'orders:cancel',
    'customers:view', 'customers:create', 'customers:edit',
    'suppliers:view',
    'inventory:view',
    'reports:view', 'reports:export',
    'users:view',
  ],
  staff: [
    'products:view',
    'orders:view', 'orders:create',
    'customers:view', 'customers:create',
    'inventory:view',
  ],
};
