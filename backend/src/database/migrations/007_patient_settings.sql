-- ============================================================
-- PATIENT SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    prescription_updates BOOLEAN NOT NULL DEFAULT TRUE,
    message_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    appointment_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    marketing_emails BOOLEAN NOT NULL DEFAULT FALSE,
    share_read_receipts BOOLEAN NOT NULL DEFAULT TRUE,
    compact_view BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_patient_settings_updated_at BEFORE UPDATE ON patient_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
