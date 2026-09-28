-- Urumuli Pharmacy System - Add MANAGER to user_role enum
-- The live database's user_role enum predates MANAGER being added to
-- 001_initial_schema.sql, so MANAGER users/invitations could not be created
-- and role-filtered user queries failed. Migration 003 already ensured the
-- MANAGER row exists in the roles table; this keeps the enum in sync.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'MANAGER';