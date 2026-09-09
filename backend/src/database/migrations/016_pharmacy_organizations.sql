-- ============================================================
-- PHARMACY ORGANIZATIONS
-- Represents real-world pharmacy businesses on the platform.
-- Each pharmacy has its own staff, medicines, and operations.
-- ============================================================

-- Extend the audit_entity enum to include new entity types
-- Note: We use VARCHAR in audit_logs (already VARCHAR-based), no enum change needed.

CREATE TABLE IF NOT EXISTS pharmacies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(300) NOT NULL,
    registration_number VARCHAR(100) UNIQUE,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(30),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Rwanda',
    logo_url TEXT,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED')),
    status_reason TEXT,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    suspended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacies_status ON pharmacies(status);
CREATE INDEX IF NOT EXISTS idx_pharmacies_name ON pharmacies(name);
CREATE INDEX IF NOT EXISTS idx_pharmacies_registration ON pharmacies(registration_number) WHERE registration_number IS NOT NULL;

CREATE TRIGGER trg_pharmacies_updated_at BEFORE UPDATE ON pharmacies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PHARMACY STAFF MEMBERSHIPS
-- Links users to pharmacies with a role scoped to that pharmacy.
-- A user can belong to multiple pharmacies in the future.
-- ============================================================

CREATE TABLE IF NOT EXISTS pharmacy_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'REMOVED')),
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
    suspension_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, pharmacy_id)
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_memberships_user ON pharmacy_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_memberships_pharmacy ON pharmacy_memberships(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_memberships_status ON pharmacy_memberships(status);

CREATE TRIGGER trg_pharmacy_memberships_updated_at BEFORE UPDATE ON pharmacy_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PROFESSIONAL PROFILES
-- Stores professional credentials for staff who hold regulated
-- roles (Pharmacist, etc.). Separate from user identity data.
-- ============================================================

CREATE TABLE IF NOT EXISTS professional_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    professional_registration_number VARCHAR(100),
    license_number VARCHAR(100),
    license_expiry DATE,
    license_issuing_authority VARCHAR(200) DEFAULT 'National Pharmacy Council of Rwanda',
    qualification VARCHAR(200),
    specialization VARCHAR(200),
    years_of_experience INTEGER,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'EXPIRED')),
    verification_notes TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    supporting_documents JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professional_profiles_user ON professional_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_verification ON professional_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_license ON professional_profiles(license_expiry) WHERE license_expiry IS NOT NULL;

CREATE TRIGGER trg_professional_profiles_updated_at BEFORE UPDATE ON professional_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROLE PERMISSIONS (centralized)
-- Maps granular permissions to roles so authorization checks
-- are data-driven, not scattered across controller logic.
-- ============================================================

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(role, permission)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission);

-- Seed default permissions for each role
INSERT INTO role_permissions (role, permission) VALUES
    -- PHARMACIST permissions
    ('PHARMACIST', 'VIEW_MEDICINES'),
    ('PHARMACIST', 'VIEW_PATIENTS'),
    ('PHARMACIST', 'VIEW_PRESCRIPTIONS'),
    ('PHARMACIST', 'REVIEW_PRESCRIPTIONS'),
    ('PHARMACIST', 'APPROVE_PRESCRIPTIONS'),
    ('PHARMACIST', 'CHAT_WITH_PATIENT'),
    ('PHARMACIST', 'PROVIDE_MEDICATION_ADVICE'),
    ('PHARMACIST', 'VIEW_STOCK'),
    ('PHARMACIST', 'MANAGE_INVENTORY'),
    ('PHARMACIST', 'VIEW_REPORTS'),

    -- INVENTORY_MANAGER permissions
    ('INVENTORY_MANAGER', 'VIEW_MEDICINES'),
    ('INVENTORY_MANAGER', 'CREATE_MEDICINE'),
    ('INVENTORY_MANAGER', 'UPDATE_MEDICINE'),
    ('INVENTORY_MANAGER', 'DELETE_MEDICINE'),
    ('INVENTORY_MANAGER', 'MANAGE_STOCK'),
    ('INVENTORY_MANAGER', 'VIEW_SUPPLIERS'),
    ('INVENTORY_MANAGER', 'VIEW_REPORTS'),

    -- CASHIER permissions
    ('CASHIER', 'VIEW_MEDICINES'),
    ('CASHIER', 'CREATE_SALE'),
    ('CASHIER', 'VIEW_ORDERS'),
    ('CASHIER', 'PROCESS_PAYMENT'),
    ('CASHIER', 'PRINT_RECEIPT'),

    -- MANAGER permissions
    ('MANAGER', 'VIEW_MEDICINES'),
    ('MANAGER', 'CREATE_MEDICINE'),
    ('MANAGER', 'UPDATE_MEDICINE'),
    ('MANAGER', 'DELETE_MEDICINE'),
    ('MANAGER', 'VIEW_PATIENTS'),
    ('MANAGER', 'VIEW_PRESCRIPTIONS'),
    ('MANAGER', 'REVIEW_PRESCRIPTIONS'),
    ('MANAGER', 'APPROVE_PRESCRIPTIONS'),
    ('MANAGER', 'CHAT_WITH_PATIENT'),
    ('MANAGER', 'PROVIDE_MEDICATION_ADVICE'),
    ('MANAGER', 'MANAGE_STOCK'),
    ('MANAGER', 'VIEW_SUPPLIERS'),
    ('MANAGER', 'CREATE_SALE'),
    ('MANAGER', 'VIEW_ORDERS'),
    ('MANAGER', 'PROCESS_PAYMENT'),
    ('MANAGER', 'VIEW_REPORTS'),
    ('MANAGER', 'MANAGE_STAFF'),
    ('MANAGER', 'INVITE_STAFF'),

    -- ADMIN permissions (inherits everything)
    ('ADMIN', 'VIEW_MEDICINES'),
    ('ADMIN', 'CREATE_MEDICINE'),
    ('ADMIN', 'UPDATE_MEDICINE'),
    ('ADMIN', 'DELETE_MEDICINE'),
    ('ADMIN', 'VIEW_PATIENTS'),
    ('ADMIN', 'VIEW_PRESCRIPTIONS'),
    ('ADMIN', 'REVIEW_PRESCRIPTIONS'),
    ('ADMIN', 'APPROVE_PRESCRIPTIONS'),
    ('ADMIN', 'CHAT_WITH_PATIENT'),
    ('ADMIN', 'PROVIDE_MEDICATION_ADVICE'),
    ('ADMIN', 'MANAGE_STOCK'),
    ('ADMIN', 'VIEW_SUPPLIERS'),
    ('ADMIN', 'CREATE_SALE'),
    ('ADMIN', 'VIEW_ORDERS'),
    ('ADMIN', 'PROCESS_PAYMENT'),
    ('ADMIN', 'VIEW_REPORTS'),
    ('ADMIN', 'MANAGE_STAFF'),
    ('ADMIN', 'INVITE_STAFF'),
    ('ADMIN', 'REMOVE_STAFF'),
    ('ADMIN', 'MANAGE_PHARMACY'),
    ('ADMIN', 'VIEW_AUDIT'),
    ('ADMIN', 'MANAGE_SETTINGS'),

    -- AUDITOR permissions
    ('AUDITOR', 'VIEW_MEDICINES'),
    ('AUDITOR', 'VIEW_PATIENTS'),
    ('AUDITOR', 'VIEW_PRESCRIPTIONS'),
    ('AUDITOR', 'VIEW_ORDERS'),
    ('AUDITOR', 'VIEW_REPORTS'),
    ('AUDITOR', 'VIEW_AUDIT')
ON CONFLICT (role, permission) DO NOTHING;

-- ============================================================
-- Extend staff_invitations with pharmacy_id (optional)
-- Links invitation to a specific pharmacy organization
-- ============================================================
ALTER TABLE staff_invitations
    ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL;
