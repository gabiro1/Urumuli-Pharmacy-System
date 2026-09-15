-- Migration 020: Add OAuth provider columns for Google Sign-In
-- Allows users to authenticate via Google without a local password

-- Add auth provider tracking columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_id VARCHAR(255);

-- Make password_hash nullable (OAuth users won't have one)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Index for fast provider lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider, auth_provider_id);
