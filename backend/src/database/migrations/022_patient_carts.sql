-- Server-side saved cart for authenticated patients. Each row is one
-- medicine line; quantities are merged via the unique (user_id, medicine_id).

CREATE TABLE patient_carts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 99),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, medicine_id)
);

CREATE INDEX idx_patient_carts_user ON patient_carts (user_id);
CREATE INDEX idx_patient_carts_medicine ON patient_carts (medicine_id);