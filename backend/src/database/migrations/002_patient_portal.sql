-- Urumuli Pharmacy System - Patient Portal & Secure Messaging
-- This migration adds patient role, profiles, and messaging infrastructure

-- Extend user_role enum to include PATIENT
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'PATIENT';

-- ============================================================
-- PATIENT PROFILES (extends users table for patients)
-- ============================================================
CREATE TABLE patient_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender gender,
    address TEXT,
    city VARCHAR(100),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    blood_group VARCHAR(5),
    weight_kg DECIMAL(5, 1),
    height_cm DECIMAL(5, 1),
    allergies_notes TEXT,
    chronic_conditions TEXT,
    insurance_provider VARCHAR(200),
    insurance_number VARCHAR(100),
    preferred_pharmacy_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_profiles_user ON patient_profiles(user_id);

-- ============================================================
-- CONVERSATIONS (patient case = one conversation)
-- ============================================================
CREATE TYPE conversation_status AS ENUM (
    'OPEN',
    'WAITING_PHARMACIST',
    'WAITING_PATIENT',
    'ESCALATED',
    'CLOSED'
);

CREATE TYPE conversation_context_type AS ENUM (
    'PRESCRIPTION',
    'MEDICINE',
    'ORDER',
    'ALLERGY',
    'GENERAL'
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_pharmacist_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status conversation_status NOT NULL DEFAULT 'WAITING_PHARMACIST',
    subject VARCHAR(300) NOT NULL,
    context_type conversation_context_type DEFAULT 'GENERAL',
    context_id UUID,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_patient ON conversations(patient_id);
CREATE INDEX idx_conversations_pharmacist ON conversations(assigned_pharmacist_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_created ON conversations(created_at DESC);
CREATE INDEX idx_conversations_context ON conversations(context_type, context_id);
CREATE INDEX idx_conversations_priority ON conversations(priority);
CREATE INDEX idx_conversations_open ON conversations(status, created_at)
    WHERE status NOT IN ('CLOSED');

-- ============================================================
-- CONVERSATION MESSAGES
-- ============================================================
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('PATIENT', 'PHARMACIST', 'ADMIN', 'SYSTEM')),
    content TEXT NOT NULL,
    attachment_url TEXT,
    attachment_type VARCHAR(50),
    attachment_name VARCHAR(300),
    is_private_note BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON conversation_messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender ON conversation_messages(sender_id);
CREATE INDEX idx_messages_unread ON conversation_messages(conversation_id, read_at)
    WHERE read_at IS NULL AND is_private_note = false;
CREATE INDEX idx_messages_created ON conversation_messages(created_at);

-- ============================================================
-- CONVERSATION EVENTS (audit trail for conversations)
-- ============================================================
CREATE TYPE conversation_event_type AS ENUM (
    'ASSIGNED',
    'UNASSIGNED',
    'STATUS_CHANGED',
    'PRIORITY_CHANGED',
    'NOTE_ADDED',
    'ESCALATED',
    'CLOSED',
    'REOPENED'
);

CREATE TABLE conversation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    event_type conversation_event_type NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    old_value VARCHAR(50),
    new_value VARCHAR(50),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_events_conversation ON conversation_events(conversation_id, created_at);

-- ============================================================
-- CANNED REPLIES (for pharmacist quick responses)
-- ============================================================
CREATE TABLE canned_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_canned_replies_category ON canned_replies(category);
CREATE INDEX idx_canned_replies_active ON canned_replies(is_active);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER trg_patient_profiles_updated_at BEFORE UPDATE ON patient_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_canned_replies_updated_at BEFORE UPDATE ON canned_replies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNCTION: Auto-close stale conversations (called by cron)
-- ============================================================
CREATE OR REPLACE FUNCTION close_stale_conversations()
RETURNS INTEGER AS $$
DECLARE
    closed_count INTEGER;
BEGIN
    UPDATE conversations
    SET status = 'CLOSED',
        closed_at = NOW(),
        updated_at = NOW()
    WHERE status NOT IN ('CLOSED')
      AND updated_at < NOW() - INTERVAL '14 days';

    GET DIAGNOSTICS closed_count = ROW_COUNT;
    RETURN closed_count;
END;
$$ LANGUAGE plpgsql;
