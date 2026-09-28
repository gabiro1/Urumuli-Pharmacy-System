// ============================================================
// RBAC permission catalog (slug-based, used by dynamic roles)
//
// These slugs are the single vocabulary managed in the Roles manager
// UI and stored in the role_permissions table. Built-in roles are
// seeded from the migration; custom roles are fully user-defined.
//
// Wildcard "*" is reserved for ADMIN / SUPER_ADMIN and grants every
// permission. It is never assignable to custom roles.
// ============================================================

export const PERMISSION_CATALOG = [
  { slug: 'dashboard:view', label: 'View dashboard', module: 'Overview' },

  { slug: 'medicine:view', label: 'View medicines / products', module: 'Medicines' },
  { slug: 'medicine:create', label: 'Create medicine', module: 'Medicines' },
  { slug: 'medicine:edit', label: 'Edit medicine', module: 'Medicines' },
  { slug: 'medicine:delete', label: 'Delete medicine', module: 'Medicines' },

  { slug: 'sale:view', label: 'View sales', module: 'Sales' },
  { slug: 'sale:create', label: 'Create sale', module: 'Sales' },
  { slug: 'sale:edit', label: 'Edit sale', module: 'Sales' },
  { slug: 'sale:void', label: 'Void / refund sale', module: 'Sales' },

  { slug: 'prescription:view', label: 'View prescriptions', module: 'Prescriptions' },
  { slug: 'prescription:create', label: 'Create prescription', module: 'Prescriptions' },
  { slug: 'prescription:approve', label: 'Review & approve prescriptions', module: 'Prescriptions' },
  { slug: 'prescription:delete', label: 'Delete prescription', module: 'Prescriptions' },

  { slug: 'inventory:view', label: 'View inventory', module: 'Inventory' },
  { slug: 'inventory:manage', label: 'Manage inventory', module: 'Inventory' },
  { slug: 'inventory:adjust', label: 'Adjust stock', module: 'Inventory' },

  { slug: 'order:view', label: 'View orders', module: 'Operations' },
  { slug: 'order:manage', label: 'Manage orders', module: 'Operations' },
  { slug: 'chat:view', label: 'View patient messages', module: 'Operations' },
  { slug: 'availability:view', label: 'View availability requests', module: 'Operations' },
  { slug: 'availability:manage', label: 'Manage availability requests', module: 'Operations' },

  { slug: 'medhistory:view', label: 'View medication history', module: 'Safety' },

  { slug: 'team:view', label: 'View team members', module: 'Team' },
  { slug: 'team:invite', label: 'Invite staff', module: 'Team' },
  { slug: 'team:manage', label: 'Change roles & account status', module: 'Team' },
  { slug: 'role:manage', label: 'Create / edit / delete roles', module: 'Team' },

  { slug: 'partner:view', label: 'View partners', module: 'Partners' },
  { slug: 'partner:manage', label: 'Manage partners', module: 'Partners' },

  { slug: 'pharmacy:view', label: 'View pharmacies', module: 'Pharmacies' },
  { slug: 'pharmacy:manage', label: 'Manage pharmacies', module: 'Pharmacies' },

  { slug: 'audit:view', label: 'View audit logs', module: 'Compliance' },
  { slug: 'dispense:view', label: 'View dispensing records', module: 'Compliance' },
  { slug: 'dispense:manage', label: 'Record dispensing', module: 'Compliance' },

  { slug: 'analytics:view', label: 'View analytics', module: 'Reporting' },
  { slug: 'insurance:view', label: 'View insurance claims', module: 'Reporting' },
  { slug: 'feedback:view', label: 'View feedback', module: 'Reporting' },

  { slug: 'settings:view', label: 'View settings', module: 'Administration' },
  { slug: 'settings:manage', label: 'Manage settings', module: 'Administration' },
];

export const PERMISSION_SLUGS = PERMISSION_CATALOG.map((p) => p.slug);

// Built-in / protected roles that cannot be deleted or renamed.
export const SYSTEM_ROLES = Object.freeze([
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'PHARMACIST',
  'CASHIER',
  'INVENTORY_MANAGER',
  'AUDITOR',
  'PATIENT',
  'GUEST',
]);

export function isCatalogPermission(slug) {
  return PERMISSION_SLUGS.includes(slug);
}