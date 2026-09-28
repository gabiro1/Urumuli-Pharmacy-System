CREATE TABLE IF NOT EXISTS contact_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES contact_messages(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  staff_email VARCHAR(255),
  staff_role VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_replies_message ON contact_replies(message_id, created_at);
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;