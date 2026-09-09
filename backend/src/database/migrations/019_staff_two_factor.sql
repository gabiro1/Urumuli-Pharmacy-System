-- Urumuli Pharmacy System - Staff Two-Factor Authentication
-- Adds TOTP-based 2FA support for staff accounts.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
  ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_users_two_factor ON users(two_factor_enabled)
  WHERE two_factor_enabled = true;
