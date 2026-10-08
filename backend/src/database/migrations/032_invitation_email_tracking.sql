-- Tracks invitation email delivery so admins can tell whether the invitee
-- actually received the email, instead of assuming it was sent.
ALTER TABLE staff_invitations ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE staff_invitations ADD COLUMN IF NOT EXISTS last_email_error TEXT;
