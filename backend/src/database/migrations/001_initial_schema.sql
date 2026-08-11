-- Urumuli Pharmacy System - Initial Database Schema
-- PostgreSQL 15+

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'PHARMACIST', 'CASHIER', 'INVENTORY_MANAGER', 'AUDITOR');
CREATE TYPE prescription_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISPENSED');
CREATE TYPE sale_status AS ENUM ('COMPLETED', 'REFUNDED', 'VOIDED');
CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'MOBILE_MONEY', 'INSURANCE', 'OTHER');
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT');
CREATE TYPE audit_entity AS ENUM ('USER', 'MEDICINE', 'STOCK_BATCH', 'SUPPLIER', 'SALE', 'PRESCRIPTION', 'ROLE', 'CATEGORY');
CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE stock_movement_type AS ENUM ('INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'EXPIRED', 'DAMAGED', 'RETURN');

-- ============================================================
-- USERS & AUTHENTICATION
-- ============================================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (name, description, permissions) VALUES
    ('ADMIN', 'Full system access', '["*"]'),
    ('PHARMACIST', 'Can manage prescriptions, verify drugs', '["prescription:*", "medicine:read", "safety:*", "sale:create"]'),
    ('CASHIER', 'Can process sales', '["sale:create", "sale:read", "payment:*"]'),
    ('INVENTORY_MANAGER', 'Can manage stock and suppliers', '["medicine:*", "stock:*", "supplier:*"]'),
    ('AUDITOR', 'Read-only access to all data', '["*:read"]');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'CASHIER',
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    refresh_token_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================================
-- MEDICINES & INVENTORY
-- ============================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);

CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(300) NOT NULL,
    generic_name VARCHAR(300),
    brand_name VARCHAR(300),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    manufacturer VARCHAR(300),
    description TEXT,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(12, 2) DEFAULT 0,
    requires_prescription BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_controlled BOOLEAN NOT NULL DEFAULT false,
    strength VARCHAR(100),
    dosage_form VARCHAR(100),
    unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'TABLET',
    storage_conditions TEXT,
    side_effects TEXT,
    contraindications TEXT,
    symptoms TEXT,
    indications TEXT,
    tags TEXT[],
    min_stock_level INTEGER DEFAULT 10,
    max_stock_level INTEGER DEFAULT 1000,
    current_stock INTEGER NOT NULL DEFAULT 0,
    reorder_point INTEGER DEFAULT 20,
    barcode VARCHAR(100) UNIQUE,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medicines_name ON medicines(name);
CREATE INDEX idx_medicines_generic_name ON medicines(generic_name);
CREATE INDEX idx_medicines_category ON medicines(category_id);
CREATE INDEX idx_medicines_is_active ON medicines(is_active);
CREATE INDEX idx_medicines_barcode ON medicines(barcode);
CREATE INDEX idx_medicines_requires_prescription ON medicines(requires_prescription);
CREATE INDEX idx_medicines_current_stock ON medicines(current_stock);
CREATE INDEX idx_medicines_tags ON medicines USING GIN(tags);

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(300) NOT NULL,
    contact_person VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Rwanda',
    tax_id VARCHAR(100),
    payment_terms VARCHAR(200),
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);

CREATE TABLE stock_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    batch_number VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    remaining_quantity INTEGER NOT NULL CHECK (remaining_quantity >= 0),
    unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(12, 2),
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_expired BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_batches_medicine ON stock_batches(medicine_id);
CREATE INDEX idx_stock_batches_supplier ON stock_batches(supplier_id);
CREATE INDEX idx_stock_batches_batch ON stock_batches(batch_number);
CREATE INDEX idx_stock_batches_expiry ON stock_batches(expiry_date);
CREATE INDEX idx_stock_batches_remaining ON stock_batches(remaining_quantity);
CREATE INDEX idx_stock_batches_available ON stock_batches(medicine_id, expiry_date) WHERE remaining_quantity > 0;

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    stock_batch_id UUID REFERENCES stock_batches(id) ON DELETE SET NULL,
    movement_type stock_movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reference_type VARCHAR(100),
    reference_id UUID,
    notes TEXT,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_medicine ON stock_movements(medicine_id);
CREATE INDEX idx_stock_movements_batch ON stock_movements(stock_batch_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- ============================================================
-- SALES / POS
-- ============================================================
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    cashier_id UUID NOT NULL REFERENCES users(id),
    pharmacist_id UUID REFERENCES users(id),
    prescription_id UUID,
    customer_name VARCHAR(200),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    amount_tendered DECIMAL(12, 2),
    change_amount DECIMAL(12, 2) DEFAULT 0,
    payment_method payment_method NOT NULL DEFAULT 'CASH',
    status sale_status NOT NULL DEFAULT 'COMPLETED',
    notes TEXT,
    pos_metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_reference ON sales(reference_number);
CREATE INDEX idx_sales_cashier ON sales(cashier_id);
CREATE INDEX idx_sales_created ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_prescription ON sales(prescription_id);
CREATE INDEX idx_sales_customer_phone ON sales(customer_phone);
CREATE INDEX idx_sales_date ON sales(created_at DESC);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id),
    stock_batch_id UUID REFERENCES stock_batches(id),
    medicine_name VARCHAR(300) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_medicine ON sale_items(medicine_id);

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_name VARCHAR(200) NOT NULL,
    patient_dob DATE,
    patient_gender gender,
    patient_phone VARCHAR(20),
    patient_email VARCHAR(255),
    patient_address TEXT,
    doctor_name VARCHAR(200) NOT NULL,
    doctor_license_number VARCHAR(100),
    hospital_name VARCHAR(300),
    diagnosis TEXT,
    notes TEXT,
    file_path TEXT,
    file_type VARCHAR(50),
    status prescription_status NOT NULL DEFAULT 'PENDING',
    pharmacist_id UUID REFERENCES users(id),
    pharmacist_notes TEXT,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    dispensed_at TIMESTAMPTZ,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_name, patient_phone);
CREATE INDEX idx_prescriptions_pharmacist ON prescriptions(pharmacist_id);
CREATE INDEX idx_prescriptions_created ON prescriptions(created_at);
CREATE INDEX idx_prescriptions_expires ON prescriptions(expires_at);

CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_name VARCHAR(300) NOT NULL,
    medicine_id UUID REFERENCES medicines(id),
    dosage VARCHAR(200) NOT NULL,
    frequency VARCHAR(200) NOT NULL,
    duration VARCHAR(200),
    quantity INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prescription_items_prescription ON prescription_items(prescription_id);

-- ============================================================
-- DRUG SAFETY ENGINE
-- ============================================================
CREATE TABLE drug_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_a_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    medicine_b_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('MILD', 'MODERATE', 'SEVERE', 'CONTRAINDICATED')),
    description TEXT NOT NULL,
    mechanism TEXT,
    recommendation TEXT,
    evidence_level VARCHAR(50),
    source VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(medicine_a_id, medicine_b_id),
    CHECK (medicine_a_id < medicine_b_id)
);

CREATE INDEX idx_drug_interactions_medicine_a ON drug_interactions(medicine_a_id);
CREATE INDEX idx_drug_interactions_medicine_b ON drug_interactions(medicine_b_id);
CREATE INDEX idx_drug_interactions_severity ON drug_interactions(severity);

CREATE TABLE patient_allergies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_phone VARCHAR(20) NOT NULL,
    patient_name VARCHAR(200),
    allergen VARCHAR(300) NOT NULL,
    allergen_type VARCHAR(50) CHECK (allergen_type IN ('MEDICINE', 'FOOD', 'OTHER')),
    severity VARCHAR(20) CHECK (severity IN ('MILD', 'MODERATE', 'SEVERE')),
    reaction TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_allergies_phone ON patient_allergies(patient_phone);

-- ============================================================
-- AUDIT LOGGING
-- ============================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    entity audit_entity NOT NULL,
    entity_id VARCHAR(100),
    description TEXT,
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_lookup ON audit_logs(entity, entity_id, action);

-- ============================================================
-- ANALYTICS & REPORTING
-- ============================================================
CREATE TABLE daily_sales_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_date DATE NOT NULL UNIQUE,
    total_sales_count INTEGER NOT NULL DEFAULT 0,
    total_revenue DECIMAL(14, 2) NOT NULL DEFAULT 0,
    total_discount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    total_tax DECIMAL(14, 2) NOT NULL DEFAULT 0,
    average_transaction_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_breakdown JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_sales_summary_date ON daily_sales_summary(sale_date DESC);

CREATE TABLE medicine_sales_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    sale_date DATE NOT NULL,
    total_quantity_sold INTEGER NOT NULL DEFAULT 0,
    total_revenue DECIMAL(14, 2) NOT NULL DEFAULT 0,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(medicine_id, sale_date)
);

CREATE INDEX idx_medicine_sales_summary_medicine ON medicine_sales_summary(medicine_id);
CREATE INDEX idx_medicine_sales_summary_date ON medicine_sales_summary(sale_date DESC);

-- ============================================================
-- SYSTEM HEALTH
-- ============================================================
CREATE TABLE system_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('UP', 'DOWN', 'DEGRADED')),
    latency_ms INTEGER,
    error_message TEXT,
    metadata JSONB,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_health_service ON system_health(service_name, checked_at DESC);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_medicines_updated_at BEFORE UPDATE ON medicines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_stock_batches_updated_at BEFORE UPDATE ON stock_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_prescriptions_updated_at BEFORE UPDATE ON prescriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_drug_interactions_updated_at BEFORE UPDATE ON drug_interactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_patient_allergies_updated_at BEFORE UPDATE ON patient_allergies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_daily_sales_summary_updated_at BEFORE UPDATE ON daily_sales_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNCTION: FEFO batch selection
-- ============================================================
CREATE OR REPLACE FUNCTION get_fefo_batches(p_medicine_id UUID, p_quantity INTEGER)
RETURNS TABLE (
    batch_id UUID,
    batch_number VARCHAR,
    expiry_date DATE,
    available_quantity INTEGER,
    unit_cost DECIMAL,
    selling_price DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sb.id,
        sb.batch_number,
        sb.expiry_date,
        sb.remaining_quantity,
        sb.unit_cost,
        COALESCE(sb.selling_price, m.price)
    FROM stock_batches sb
    JOIN medicines m ON m.id = sb.medicine_id
    WHERE sb.medicine_id = p_medicine_id
      AND sb.remaining_quantity > 0
      AND sb.expiry_date >= CURRENT_DATE
    ORDER BY sb.expiry_date ASC, sb.received_date ASC
    LIMIT p_quantity;
END;
$$ LANGUAGE plpgsql;
