-- Urumuli Pharmacy System - Dynamic roles / RBAC
--
-- 1. users.role and staff_invitations.role move from a fixed enum to VARCHAR,
--    allowing any role defined in the `roles` table (including user-created
--    roles) to be assigned without schema changes.
-- 2. The `roles` table becomes the source of truth, gains an `is_system`
--    flag, and is guaranteed to contain every built-in role.
-- 3. role_permissions is re-seeded for the built-in roles with slug-based
--    permissions (see backend/src/permissions.js for the vocabulary).
--    Custom roles written through the Roles manager store permissions here too.

-- ----------------------------------------------------------------------
-- 1. Widen role columns
-- ----------------------------------------------------------------------
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'CASHIER';

ALTER TABLE staff_invitations ALTER COLUMN role TYPE VARCHAR(50) USING role::text;
ALTER TABLE staff_invitations ALTER COLUMN role SET DEFAULT 'PHARMACIST';

-- ----------------------------------------------------------------------
-- 2. roles table: is_system flag + guaranteed built-in rows
-- ----------------------------------------------------------------------
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

INSERT INTO roles (name, description, permissions, is_system) VALUES
    ('SUPER_ADMIN', 'Full system access', '["*"]', true),
    ('MANAGER', 'Oversight and approvals', '[]', true),
    ('PATIENT', 'Patient portal user', '[]', true),
    ('GUEST', 'Read-only guest', '[]', true)
ON CONFLICT (name) DO NOTHING;

UPDATE roles SET is_system = true, permissions = CASE
    WHEN name IN ('ADMIN', 'SUPER_ADMIN') THEN '["*"]'
    ELSE permissions
END
WHERE name IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PHARMACIST', 'CASHIER', 'INVENTORY_MANAGER', 'AUDITOR', 'PATIENT', 'GUEST');

-- ----------------------------------------------------------------------
-- 3. Re-seed role_permissions for the built-in roles (slug vocabulary)
-- ----------------------------------------------------------------------
DELETE FROM role_permissions WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PHARMACIST', 'CASHIER', 'INVENTORY_MANAGER', 'AUDITOR', 'PATIENT', 'GUEST');

INSERT INTO role_permissions (role, permission) VALUES
    ('SUPER_ADMIN', '*'),
    ('ADMIN', '*'),

    ('MANAGER', 'dashboard:view'),
    ('MANAGER', 'medicine:view'),
    ('MANAGER', 'medicine:create'),
    ('MANAGER', 'medicine:edit'),
    ('MANAGER', 'sale:view'),
    ('MANAGER', 'sale:create'),
    ('MANAGER', 'sale:edit'),
    ('MANAGER', 'sale:void'),
    ('MANAGER', 'prescription:view'),
    ('MANAGER', 'prescription:create'),
    ('MANAGER', 'prescription:approve'),
    ('MANAGER', 'inventory:view'),
    ('MANAGER', 'inventory:manage'),
    ('MANAGER', 'inventory:adjust'),
    ('MANAGER', 'order:view'),
    ('MANAGER', 'order:manage'),
    ('MANAGER', 'chat:view'),
    ('MANAGER', 'availability:view'),
    ('MANAGER', 'availability:manage'),
    ('MANAGER', 'safety:view'),
    ('MANAGER', 'medhistory:view'),
    ('MANAGER', 'team:view'),
    ('MANAGER', 'team:invite'),
    ('MANAGER', 'team:manage'),
    ('MANAGER', 'partner:view'),
    ('MANAGER', 'pharmacy:view'),
    ('MANAGER', 'pharmacy:manage'),
    ('MANAGER', 'audit:view'),
    ('MANAGER', 'controlled:view'),
    ('MANAGER', 'expiry:view'),
    ('MANAGER', 'dispense:view'),
    ('MANAGER', 'transfer:view'),
    ('MANAGER', 'report:view'),
    ('MANAGER', 'analytics:view'),
    ('MANAGER', 'insurance:view'),
    ('MANAGER', 'feedback:view'),

    ('PHARMACIST', 'dashboard:view'),
    ('PHARMACIST', 'medicine:view'),
    ('PHARMACIST', 'medicine:create'),
    ('PHARMACIST', 'medicine:edit'),
    ('PHARMACIST', 'sale:view'),
    ('PHARMACIST', 'sale:create'),
    ('PHARMACIST', 'sale:edit'),
    ('PHARMACIST', 'prescription:view'),
    ('PHARMACIST', 'prescription:create'),
    ('PHARMACIST', 'prescription:approve'),
    ('PHARMACIST', 'inventory:view'),
    ('PHARMACIST', 'inventory:manage'),
    ('PHARMACIST', 'order:view'),
    ('PHARMACIST', 'order:manage'),
    ('PHARMACIST', 'chat:view'),
    ('PHARMACIST', 'availability:view'),
    ('PHARMACIST', 'availability:manage'),
    ('PHARMACIST', 'safety:view'),
    ('PHARMACIST', 'medhistory:view'),
    ('PHARMACIST', 'audit:view'),
    ('PHARMACIST', 'controlled:view'),
    ('PHARMACIST', 'controlled:manage'),
    ('PHARMACIST', 'expiry:view'),
    ('PHARMACIST', 'expiry:manage'),
    ('PHARMACIST', 'dispense:view'),
    ('PHARMACIST', 'dispense:manage'),
    ('PHARMACIST', 'transfer:view'),
    ('PHARMACIST', 'transfer:manage'),
    ('PHARMACIST', 'report:view'),
    ('PHARMACIST', 'analytics:view'),
    ('PHARMACIST', 'insurance:view'),
    ('PHARMACIST', 'feedback:view'),

    ('CASHIER', 'dashboard:view'),
    ('CASHIER', 'medicine:view'),
    ('CASHIER', 'sale:view'),
    ('CASHIER', 'sale:create'),
    ('CASHIER', 'sale:edit'),
    ('CASHIER', 'order:view'),
    ('CASHIER', 'inventory:view'),

    ('INVENTORY_MANAGER', 'dashboard:view'),
    ('INVENTORY_MANAGER', 'medicine:view'),
    ('INVENTORY_MANAGER', 'medicine:create'),
    ('INVENTORY_MANAGER', 'medicine:edit'),
    ('INVENTORY_MANAGER', 'inventory:view'),
    ('INVENTORY_MANAGER', 'inventory:manage'),
    ('INVENTORY_MANAGER', 'inventory:adjust'),
    ('INVENTORY_MANAGER', 'order:view'),
    ('INVENTORY_MANAGER', 'expiry:view'),
    ('INVENTORY_MANAGER', 'expiry:manage'),
    ('INVENTORY_MANAGER', 'transfer:view'),
    ('INVENTORY_MANAGER', 'transfer:manage'),
    ('INVENTORY_MANAGER', 'dispense:view'),
    ('INVENTORY_MANAGER', 'report:view'),
    ('INVENTORY_MANAGER', 'analytics:view'),

    ('AUDITOR', 'dashboard:view'),
    ('AUDITOR', 'medicine:view'),
    ('AUDITOR', 'sale:view'),
    ('AUDITOR', 'prescription:view'),
    ('AUDITOR', 'inventory:view'),
    ('AUDITOR', 'order:view'),
    ('AUDITOR', 'safety:view'),
    ('AUDITOR', 'medhistory:view'),
    ('AUDITOR', 'audit:view'),
    ('AUDITOR', 'controlled:view'),
    ('AUDITOR', 'expiry:view'),
    ('AUDITOR', 'dispense:view'),
    ('AUDITOR', 'transfer:view'),
    ('AUDITOR', 'report:view'),
    ('AUDITOR', 'analytics:view'),
    ('AUDITOR', 'insurance:view'),
    ('AUDITOR', 'feedback:view'),
    ('AUDITOR', 'team:view');

COMMENT ON TABLE roles IS 'Source of truth for system and user-defined roles. is_system roles cannot be renamed or deleted.';