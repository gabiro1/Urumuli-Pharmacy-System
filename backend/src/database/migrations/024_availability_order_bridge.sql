-- Allow a pharmacist's physical availability quote to become a patient order.
-- Catalog medicine ids remain optional because the original request may be for
-- a medicine that was not in the digital catalog.

ALTER TABLE medicine_availability_requests
  ADD COLUMN IF NOT EXISTS quoted_unit_price DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE order_items
  ALTER COLUMN medicine_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_availability_requests_order
  ON medicine_availability_requests(order_id)
  WHERE order_id IS NOT NULL;
