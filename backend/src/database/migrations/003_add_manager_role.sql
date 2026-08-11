-- Urumuli Pharmacy System - Add MANAGER role to roles table
-- MANAGER already exists in user_role enum (from 001_initial_schema.sql)
-- but was never seeded into the roles table.

INSERT INTO roles (name, description, permissions) VALUES
    ('MANAGER', 'Oversight and approvals', '["sale:refund", "prescription:approve", "report:*", "user:read", "medicine:write"]')
ON CONFLICT (name) DO NOTHING;
