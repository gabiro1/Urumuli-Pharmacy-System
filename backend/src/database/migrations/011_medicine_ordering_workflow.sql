-- Secure patient ordering and pharmacist dispensing workflow

ALTER TABLE medicines
  ADD COLUMN IF NOT EXISTS classification VARCHAR(32) NOT NULL DEFAULT 'OTC'
    CHECK (classification IN ('OTC', 'PRESCRIPTION_REQUIRED', 'RESTRICTED')),
  ADD COLUMN IF NOT EXISTS pack_size VARCHAR(120),
  ADD COLUMN IF NOT EXISTS selling_unit VARCHAR(80) NOT NULL DEFAULT 'pack',
  ADD COLUMN IF NOT EXISTS availability_status VARCHAR(24) NOT NULL DEFAULT 'IN_STOCK'
    CHECK (availability_status IN ('IN_STOCK', 'LOW_STOCK', 'UNAVAILABLE')),
  ADD COLUMN IF NOT EXISTS general_warnings TEXT,
  ADD COLUMN IF NOT EXISTS approved_information_url TEXT,
  ADD COLUMN IF NOT EXISTS otc_review_required BOOLEAN NOT NULL DEFAULT false;

UPDATE medicines SET classification = CASE
  WHEN is_controlled THEN 'RESTRICTED'
  WHEN requires_prescription THEN 'PRESCRIPTION_REQUIRED'
  ELSE 'OTC'
END;

CREATE TABLE IF NOT EXISTS patient_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  full_name VARCHAR(200),
  verified_phone VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(255),
  verification_status VARCHAR(20) NOT NULL DEFAULT 'VERIFIED',
  profile_completion_status VARCHAR(20) NOT NULL DEFAULT 'INCOMPLETE',
  notification_preferences JSONB NOT NULL DEFAULT '{"channel":"SMS"}',
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(30) NOT NULL,
  purpose VARCHAR(40) NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO patient_identities(user_id,full_name,verified_phone,email,profile_completion_status)
SELECT id,TRIM(first_name || ' ' || last_name),phone,email,'COMPLETE' FROM users
WHERE role='PATIENT' AND phone IS NOT NULL
ON CONFLICT (verified_phone) DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_otp_phone_created ON otp_challenges(phone, created_at DESC);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_reference VARCHAR(32) UNIQUE NOT NULL,
  patient_identity_id UUID NOT NULL REFERENCES patient_identities(id),
  account_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(64) NOT NULL,
  order_type VARCHAR(24) NOT NULL CHECK (order_type IN ('OTC', 'PRESCRIPTION', 'MIXED')),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'RWF',
  fulfilment_method VARCHAR(20) CHECK (fulfilment_method IN ('PICKUP', 'DELIVERY')),
  delivery_address TEXT,
  payment_method VARCHAR(30),
  payment_status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED',
  assigned_pharmacist_id UUID REFERENCES users(id) ON DELETE SET NULL,
  priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
  patient_confirmed_at TIMESTAMPTZ,
  consented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_identity ON orders(patient_identity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id),
  medicine_snapshot JSONB NOT NULL,
  requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0),
  approved_quantity INTEGER CHECK (approved_quantity > 0),
  selling_unit VARCHAR(80) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
  total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
  prescription_required BOOLEAN NOT NULL DEFAULT false,
  approval_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE prescriptions
  ALTER COLUMN uploaded_by DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS patient_identity_id UUID REFERENCES patient_identities(id),
  ADD COLUMN IF NOT EXISTS validity_status VARCHAR(24) NOT NULL DEFAULT 'UNASSESSED',
  ADD COLUMN IF NOT EXISTS decision_reason_code VARCHAR(80),
  ADD COLUMN IF NOT EXISTS unverified_ocr_data JSONB;

CREATE TABLE IF NOT EXISTS prescription_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  storage_key TEXT UNIQUE NOT NULL,
  original_extension VARCHAR(12) NOT NULL,
  mime_type VARCHAR(80) NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 VARCHAR(64) NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  patient_identity_id UUID NOT NULL REFERENCES patient_identities(id),
  medicine_id UUID NOT NULL REFERENCES medicines(id),
  medicine_snapshot JSONB NOT NULL,
  strength VARCHAR(100) NOT NULL,
  dosage_form VARCHAR(100) NOT NULL,
  dispensed_quantity DECIMAL(12,3) NOT NULL CHECK (dispensed_quantity > 0),
  quantity_per_dose DECIMAL(12,3) NOT NULL CHECK (quantity_per_dose > 0),
  dose_unit VARCHAR(40) NOT NULL,
  route VARCHAR(80) NOT NULL,
  frequency_type VARCHAR(40) NOT NULL,
  frequency_value INTEGER,
  administration_times JSONB NOT NULL DEFAULT '[]',
  duration_value INTEGER,
  duration_unit VARCHAR(30),
  start_date DATE NOT NULL,
  end_date DATE,
  food_relationship VARCHAR(80),
  special_instructions TEXT,
  warnings TEXT,
  storage_instructions TEXT,
  missed_dose_instructions TEXT,
  prescriber_name VARCHAR(200),
  prescription_reference VARCHAR(120),
  pharmacist_id UUID NOT NULL REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'VERIFIED',
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_item_id, version)
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_status VARCHAR(64),
  new_status VARCHAR(64) NOT NULL,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(40) NOT NULL,
  reason TEXT,
  internal_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID UNIQUE NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  expires_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  idempotency_key VARCHAR(120) UNIQUE NOT NULL,
  provider VARCHAR(40) NOT NULL,
  provider_reference VARCHAR(160),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  status VARCHAR(30) NOT NULL,
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope VARCHAR(80) NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  owner_key VARCHAR(120) NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scope, idempotency_key, owner_key)
);

CREATE TRIGGER trg_patient_identities_updated_at BEFORE UPDATE ON patient_identities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_order_items_updated_at BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_medication_instructions_updated_at BEFORE UPDATE ON medication_instructions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_payment_attempts_updated_at BEFORE UPDATE ON payment_attempts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
