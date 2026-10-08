-- ============================================================
-- 031: Delivery tracking workflow
--
-- Makes `delivery_tracking` a first-class operational record so staff can
-- see who bought what, follow the parcel, and confirm handover:
--
--   1. Widens the status CHECK to include 'CANCELLED' (the service layer
--      already allowed it, the database rejected it).
--   2. Adds handover / dispatch columns: dispatched_at, receiver_name,
--      received_by, confirmation_note, failure_reason, attempt.
--   3. Adds `delivery_status_history` - an append-only event log of every
--      movement, which is the audit trail the order_status_history table
--      does not provide for the physical delivery leg.
--   4. Backfills a delivery record for every DELIVERY order that does not
--      have one, so existing purchases are visible immediately.
--   5. Registers the delivery:view / delivery:manage permission slugs.
-- ============================================================

-- ----------------------------------------------------------------------
-- 1. Status vocabulary
-- ----------------------------------------------------------------------
ALTER TABLE delivery_tracking DROP CONSTRAINT IF EXISTS delivery_tracking_status_check;
ALTER TABLE delivery_tracking ADD CONSTRAINT delivery_tracking_status_check
  CHECK (status IN ('PENDING','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY',
                    'DELIVERED','FAILED','RETURNED','CANCELLED'));

-- ----------------------------------------------------------------------
-- 2. Dispatch / handover columns
-- ----------------------------------------------------------------------
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(255);
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS confirmation_note TEXT;
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE delivery_tracking ADD COLUMN IF NOT EXISTS attempt INTEGER NOT NULL DEFAULT 1;

-- ----------------------------------------------------------------------
-- 3. Event log
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES delivery_tracking(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(50) NOT NULL,
  location_note TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_history_delivery
  ON delivery_status_history(delivery_id, created_at);
CREATE INDEX IF NOT EXISTS idx_delivery_history_order
  ON delivery_status_history(order_id, created_at);

-- ----------------------------------------------------------------------
-- 4. Indexes for the staff queue
-- ----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_delivery_status_created
  ON delivery_tracking(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_actual
  ON delivery_tracking(actual_delivery DESC);

-- Deduplicate BEFORE adding the unique index below, or the index build fails
-- on any order that already has more than one live delivery row. Keep the
-- newest live row per order and archive the superseded ones in the event log.
WITH ranked AS (
  SELECT id, order_id, status,
         row_number() OVER (PARTITION BY order_id ORDER BY created_at DESC, id DESC) AS rn
  FROM delivery_tracking
  WHERE status NOT IN ('DELIVERED','RETURNED','CANCELLED')
)
INSERT INTO delivery_status_history (delivery_id, order_id, previous_status, new_status, actor_role, note)
SELECT dt.id, dt.order_id, dt.status, 'RETURNED', 'SYSTEM',
       'Superseded by a newer delivery record for the same order'
FROM delivery_tracking dt
JOIN ranked r ON r.id = dt.id
WHERE r.rn > 1;

DELETE FROM delivery_tracking dt
USING (
  SELECT id, row_number() OVER (PARTITION BY order_id ORDER BY created_at DESC, id DESC) AS rn
  FROM delivery_tracking
  WHERE status NOT IN ('DELIVERED','RETURNED','CANCELLED')
) r
WHERE dt.id = r.id AND r.rn > 1;

-- Only one live delivery per order. Terminal rows are excluded so a failed
-- attempt can be superseded without deleting the closed record.
CREATE UNIQUE INDEX IF NOT EXISTS uq_delivery_live_per_order
  ON delivery_tracking(order_id)
  WHERE status NOT IN ('DELIVERED','RETURNED','CANCELLED');

-- ----------------------------------------------------------------------
-- 5. Backfill existing DELIVERY orders
-- ----------------------------------------------------------------------
INSERT INTO delivery_tracking
  (order_id, status, delivery_address, recipient_name, recipient_phone,
   actual_delivery, attempt, delivery_notes)
SELECT
  o.id,
  CASE
    WHEN o.status = 'COMPLETED' AND o.fulfilment_method = 'DELIVERY' THEN 'DELIVERED'
    WHEN o.status = 'OUT_FOR_DELIVERY' THEN 'OUT_FOR_DELIVERY'
    ELSE 'PENDING'
  END,
  o.delivery_address,
  pi.full_name,
  pi.verified_phone,
  o.delivered_at,
  1,
  'Imported from order history'
FROM orders o
JOIN patient_identities pi ON pi.id = o.patient_identity_id
WHERE o.fulfilment_method = 'DELIVERY'
  AND NOT EXISTS (SELECT 1 FROM delivery_tracking dt WHERE dt.order_id = o.id);

-- Give every backfilled record a creation event so the timeline is not empty.
INSERT INTO delivery_status_history (delivery_id, order_id, previous_status, new_status, actor_role, note)
SELECT dt.id, dt.order_id, NULL, dt.status, 'SYSTEM', 'Delivery record created'
FROM delivery_tracking dt
WHERE NOT EXISTS (SELECT 1 FROM delivery_status_history h WHERE h.delivery_id = dt.id);

-- ----------------------------------------------------------------------
-- 6. updated_at maintenance
-- ----------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_delivery_tracking_updated_at ON delivery_tracking;
CREATE TRIGGER trg_delivery_tracking_updated_at BEFORE UPDATE ON delivery_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------
-- 7. Permissions
-- ----------------------------------------------------------------------
INSERT INTO role_permissions (role, permission) VALUES
  ('MANAGER', 'delivery:view'),
  ('MANAGER', 'delivery:manage'),
  ('PHARMACIST', 'delivery:view'),
  ('PHARMACIST', 'delivery:manage'),
  ('CASHIER', 'delivery:view'),
  ('AUDITOR', 'delivery:view')
ON CONFLICT DO NOTHING;
