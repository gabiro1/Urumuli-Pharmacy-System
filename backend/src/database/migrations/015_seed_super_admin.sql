-- ============================================================
-- SEED INITIAL SUPER_ADMIN ACCOUNT
-- Runs in its own migration file because the SUPER_ADMIN enum value
-- added by 014 can only be used after that migration commits.
--
-- DEFAULT CREDENTIALS (MUST BE CHANGED ON FIRST LOGIN):
--   email:    admin@urumuli.rw
--   password: Urumuli@Admin2026
-- ============================================================
INSERT INTO users (email, password_hash, first_name, last_name, phone, role, email_verified_at)
SELECT 'admin@urumuli.rw',
       '$2b$12$/tFMRKNvsTMFkl./CQKOMeqjP3bGiy9KagQ5k8TMVkwl9d9l66l2u',
       'System', 'Admin', NULL, 'SUPER_ADMIN', NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@urumuli.rw');
