-- Extend the established medicines catalog in-place. Existing IDs and all FK relationships remain unchanged.
ALTER TABLE medicines
  ADD COLUMN IF NOT EXISTS product_type VARCHAR(24) NOT NULL DEFAULT 'MEDICINE'
    CHECK (product_type IN ('MEDICINE', 'PHARMACY_CARE')),
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(160),
  ADD COLUMN IF NOT EXISTS sku VARCHAR(120),
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS active_ingredients TEXT,
  ADD COLUMN IF NOT EXISTS route_of_administration VARCHAR(120),
  ADD COLUMN IF NOT EXISTS dosage_instructions TEXT,
  ADD COLUMN IF NOT EXISTS care_purpose VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ingredients TEXT,
  ADD COLUMN IF NOT EXISTS usage_instructions TEXT,
  ADD COLUMN IF NOT EXISTS size_description VARCHAR(120),
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_medicines_sku_unique
  ON medicines(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_medicines_product_type ON medicines(product_type);
CREATE INDEX IF NOT EXISTS idx_medicines_supplier ON medicines(supplier_id);
CREATE INDEX IF NOT EXISTS idx_medicines_expiry ON medicines(expiry_date) WHERE expiry_date IS NOT NULL;
