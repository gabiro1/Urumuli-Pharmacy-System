-- 026_order_fulfilment_split
-- Separates the fulfilment stage from the order lifecycle status so every order
-- can be read as three independent concepts:
--   1. payment_status   (NOT_STARTED / PROCESSING / PAID / FAILED / DUE_ON_PICKUP / REFUNDED / PARTIALLY_REFUNDED)
--   2. fulfilment_status(AWAITING_DISPENSING / PREPARING / READY_FOR_PICKUP / OUT_FOR_DELIVERY / DISPENSED / DELIVERED / FULFILLED / CANCELLED)
--   3. fulfilment_method(PICKUP / DELIVERY)
-- The order `status` column remains the authoritative lifecycle state machine;
-- fulfilment_status tracks only the physical-handover stage of that lifecycle.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfilment_status VARCHAR(32);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Backfill existing orders from their lifecycle status. Pre-payment / review
-- stages get NULL (fulfilment has not started), which the API renders as
-- 'Not started'. Repeated runs are safe because only NULL rows are touched.
UPDATE orders SET fulfilment_status = _map.fulfilment_status FROM (VALUES
  ('PAYMENT_RECEIVED',  'AWAITING_DISPENSING'),
  ('PAYMENT_DEFERRED',  'AWAITING_DISPENSING'),
  ('PREPARING',         'PREPARING'),
  ('READY_FOR_PICKUP',  'READY_FOR_PICKUP'),
  ('OUT_FOR_DELIVERY',  'OUT_FOR_DELIVERY'),
  ('COMPLETED-PICKUP',  'DISPENSED'),
  ('COMPLETED-DELIVERY','DELIVERED'),
  ('CANCELLED',         'CANCELLED'),
  ('REFUNDED',          'CANCELLED'),
  ('REJECTED_BY_PHARMACIST','CANCELLED')
) AS _map(status_key, fulfilment_status)
WHERE orders.fulfilment_status IS NULL
  AND orders.status = CASE
    WHEN orders.status = 'COMPLETED' AND orders.fulfilment_method = 'DELIVERY' THEN 'COMPLETED-DELIVERY'
    WHEN orders.status = 'COMPLETED' AND orders.fulfilment_method <> 'DELIVERY' THEN 'COMPLETED-PICKUP'
    ELSE orders.status
  END
  AND orders.status IN ('PAYMENT_RECEIVED','PAYMENT_DEFERRED','PREPARING','READY_FOR_PICKUP','OUT_FOR_DELIVERY','COMPLETED','CANCELLED','REFUNDED','REJECTED_BY_PHARMACIST');

-- Completed orders were handed over; refunded/cancelled/terminated orders stopped.
UPDATE orders SET fulfilled_at = updated_at WHERE status = 'COMPLETED' AND fulfilled_at IS NULL;
UPDATE orders SET cancelled_at = updated_at WHERE status IN ('CANCELLED','REFUNDED','REJECTED_BY_PHARMACIST') AND cancelled_at IS NULL;
UPDATE orders SET paid_at = updated_at WHERE payment_status = 'PAID' AND paid_at IS NULL;