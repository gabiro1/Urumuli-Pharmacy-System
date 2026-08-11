-- Urumuli Pharmacy System - Refocus as Prescription & Communication System
-- Removes all inventory, sales, POS, drug safety, analytics tables
-- Adds UNDER_REVIEW to prescription workflow
-- Links prescriptions to patient accounts
-- Adds notification infrastructure

-- ============================================================
-- 1. Add UNDER_REVIEW to prescription statuses
-- ============================================================
ALTER TYPE prescription_status ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';

-- ============================================================
-- 2. Link prescriptions to patient accounts
-- ============================================================
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);

-- ============================================================
-- 3. Strip stock/inventory columns from medicines catalog
--    Keep read-only: name, description, usage, side effects
-- ============================================================
ALTER TABLE medicines
  DROP COLUMN IF EXISTS cost_price,
  DROP COLUMN IF EXISTS price,
  DROP COLUMN IF EXISTS min_stock_level,
  DROP COLUMN IF EXISTS max_stock_level,
  DROP COLUMN IF EXISTS current_stock,
  DROP COLUMN IF EXISTS reorder_point,
  DROP COLUMN IF EXISTS barcode,
  DROP COLUMN IF EXISTS is_controlled;

-- ============================================================
-- 4. Drop inventory/sales/safety/analytics tables
--    Order matters for FK constraints
-- ============================================================
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS stock_batches CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS drug_interactions CASCADE;
DROP TABLE IF EXISTS patient_allergies CASCADE;
DROP TABLE IF EXISTS daily_sales_summary CASCADE;
DROP TABLE IF EXISTS medicine_sales_summary CASCADE;
DROP TABLE IF EXISTS system_health CASCADE;

-- ============================================================
-- 5. Remove unused triggers
-- ============================================================
DROP TRIGGER IF EXISTS trg_stock_batches_updated_at ON stock_batches;
DROP TRIGGER IF EXISTS trg_sales_updated_at ON sales;
DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
DROP TRIGGER IF EXISTS trg_drug_interactions_updated_at ON drug_interactions;
DROP TRIGGER IF EXISTS trg_patient_allergies_updated_at ON patient_allergies;
DROP TRIGGER IF EXISTS trg_daily_sales_summary_updated_at ON daily_sales_summary;
DROP TRIGGER IF EXISTS trg_medicine_sales_summary_updated_at ON medicine_sales_summary;

-- ============================================================
-- 6. Remove unused function
-- ============================================================
DROP FUNCTION IF EXISTS get_fefo_batches(UUID, INTEGER);

-- ============================================================
-- 7. Create notifications table
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(300) NOT NULL,
    message TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- 8. Update role descriptions (remove inventory/sales references)
-- ============================================================
UPDATE roles SET description = 'Oversight and approvals. Can manage users, view reports, approve prescriptions.',
                 permissions = '["sale:refund", "prescription:approve", "report:*", "user:read", "user:write", "medicine:read"]'
WHERE name = 'MANAGER';

UPDATE roles SET description = 'Can manage prescriptions, verify drugs, communicate with patients.',
                 permissions = '["prescription:*", "medicine:read", "chat:*", "user:read"]'
WHERE name = 'PHARMACIST';

UPDATE roles SET description = 'Full system access. Can manage users, view logs, configure system.',
                 permissions = '["*"]'
WHERE name = 'ADMIN';

UPDATE roles SET description = 'Read-only access to prescriptions, conversations, and activity logs.',
                 permissions = '["prescription:read", "conversation:read", "user:read", "audit:read"]'
WHERE name = 'AUDITOR';
