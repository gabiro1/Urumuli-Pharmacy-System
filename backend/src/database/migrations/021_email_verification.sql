-- Email verification for patient accounts (Google sign-in flow).
-- One-time token so a brand-new Google-created account must confirm the email
-- address before the app issues sign-in tokens.

ALTER TABLE users
  ADD COLUMN email_verification_token_hash VARCHAR(255),
  ADD COLUMN email_verification_expires_at TIMESTAMPTZ;

CREATE INDEX idx_users_email_verification_token
  ON users (email_verification_token_hash)
  WHERE email_verification_token_hash IS NOT NULL;