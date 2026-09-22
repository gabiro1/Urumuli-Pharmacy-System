-- Urumuli Pharmacy System - Physical Medicine Availability Verification
-- Tracks customer requests to verify medicines that are not confirmed in the
-- digital inventory, so a pharmacist can check the physical pharmacy and
-- optionally synchronize the verified quantity back to the official inventory.

CREATE TABLE medicine_availability_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
    medicine_name VARCHAR(300) NOT NULL,
    searched_term TEXT,
    -- Digital inventory snapshot at the moment the request was created.
    system_stock INTEGER NOT NULL DEFAULT 0,
    verification_status VARCHAR(40) NOT NULL DEFAULT 'PENDING'
        CHECK (verification_status IN (
            'PENDING',
            'PHYSICALLY_AVAILABLE',
            'PHYSICALLY_UNAVAILABLE',
            'INVENTORY_UPDATED'
        )),
    physical_stock_confirmed INTEGER,
    pharmacist_id UUID REFERENCES users(id) ON DELETE SET NULL,
    pharmacist_notes TEXT,
    verified_at TIMESTAMPTZ,
    inventory_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_avail_req_patient ON medicine_availability_requests(patient_id);
CREATE INDEX idx_avail_req_medicine ON medicine_availability_requests(medicine_id);
CREATE INDEX idx_avail_req_status ON medicine_availability_requests(verification_status);
CREATE INDEX idx_avail_req_created ON medicine_availability_requests(created_at DESC);

CREATE TRIGGER trg_medicine_availability_requests_updated_at
    BEFORE UPDATE ON medicine_availability_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();