-- ============================================================
-- SUPER_ADMIN ROLE + STAFF INVITATIONS
-- Adds the SUPER_ADMIN role (only role that can create staff
-- invitations) and the table that stores pending/issued invites.
-- NOTE: The enum value must be added in its own statement — a new
-- enum value cannot be *used* until the statement that added it
-- has committed. That is why the seeded SUPER_ADMIN account lives
-- in the next migration file.
-- ============================================================
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

CREATE TABLE IF NOT EXISTS staff_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    full_name VARCHAR(200),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    accepted_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON staff_invitations(email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON staff_invitations(status);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations(token_hash);

CREATE TRIGGER trg_staff_invitations_updated_at BEFORE UPDATE ON staff_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
