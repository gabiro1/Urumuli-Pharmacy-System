-- ============================================================
-- 029: Remove Drug Safety (Drug Checker) + standalone
--      Compliance modules (Expiry, Controlled Substances,
--      Transfers, Regulatory Reports)
--
-- Drops the backing tables, removes orphaned role_permissions,
-- cleans legacy roles.permissions JSONB, and drops the
-- expiry_alerts metric column from analytics snapshots.
-- ============================================================

DROP TABLE IF EXISTS drug_interactions CASCADE;
DROP TABLE IF EXISTS patient_allergies CASCADE;
DROP TABLE IF EXISTS medicine_expiry_alerts CASCADE;
DROP TABLE IF EXISTS controlled_substance_register CASCADE;
DROP TABLE IF EXISTS pharmacy_transfers CASCADE;
DROP TABLE IF EXISTS regulatory_reports CASCADE;

ALTER TABLE analytics_daily_snapshot DROP COLUMN IF EXISTS expiry_alerts;

DELETE FROM role_permissions
WHERE permission IN (
  'safety:view',
  'safety:*',
  'controlled:view',
  'controlled:manage',
  'expiry:view',
  'expiry:manage',
  'transfer:view',
  'transfer:manage',
  'report:view',
  'report:*'
);

UPDATE roles
SET permissions = (
  SELECT COALESCE(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
  FROM jsonb_array_elements_text(permissions) WITH ORDINALITY AS t(elem, ord)
  WHERE elem NOT IN (
    'safety:view',
    'safety:*',
    'controlled:view',
    'controlled:manage',
    'expiry:view',
    'expiry:manage',
    'transfer:view',
    'transfer:manage',
    'report:view',
    'report:*'
  )
)
WHERE permissions IS NOT NULL
  AND permissions <> '[]'::jsonb
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(permissions) AS elem
    WHERE elem IN (
      'safety:view',
      'safety:*',
      'controlled:view',
      'controlled:manage',
      'expiry:view',
      'expiry:manage',
      'transfer:view',
      'transfer:manage',
      'report:view',
      'report:*'
    )
  );