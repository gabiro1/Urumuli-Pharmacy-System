-- ============================================================
-- 017: Advanced Features — Expiry Alerts, Medication History,
--      Dispensing, Notifications, i18n, Operating Hours,
--      Substitutions, Delivery, Refills, Consent, Insurance,
--      Controlled Substances, Reordering, Analytics, Telehealth,
--      Transfers, Adherence, Regulatory Reports
-- ============================================================

-- 1. MEDICINE EXPIRY ALERTS
CREATE TABLE IF NOT EXISTS medicine_expiry_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_batch_id UUID NOT NULL REFERENCES stock_batches(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('THIRTY_DAY', 'SIXTY_DAY', 'NINETY_DAY', 'EXPIRED')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'DISPOSED', 'DISMISSED')),
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_status ON medicine_expiry_alerts(status);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_medicine ON medicine_expiry_alerts(medicine_id);

-- 2. PATIENT MEDICATION HISTORY
CREATE TABLE IF NOT EXISTS patient_medication_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
  medicine_name VARCHAR(255) NOT NULL,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  dosage VARCHAR(255),
  frequency VARCHAR(255),
  duration VARCHAR(255),
  prescribed_by VARCHAR(255),
  start_date DATE,
  end_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'DISCONTINUED', 'EXPIRED')),
  discontinuation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_med_history_patient ON patient_medication_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_med_history_status ON patient_medication_history(status);

-- 3. DISPENSING RECORDS (Prescription-to-Dispensing workflow)
CREATE TABLE IF NOT EXISTS dispensing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pharmacist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stock_batch_id UUID REFERENCES stock_batches(id) ON DELETE SET NULL,
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  quantity_dispensed INTEGER NOT NULL CHECK (quantity_dispensed > 0),
  unit_price NUMERIC(10,2),
  total_price NUMERIC(10,2),
  dispensing_notes TEXT,
  patient_instructions TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'DISPENSED' CHECK (status IN ('RESERVED', 'DISPENSED', 'RETURNED', 'CANCELLED')),
  dispensed_at TIMESTAMPTZ DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dispensing_patient ON dispensing_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_dispensing_pharmacist ON dispensing_records(pharmacist_id);
CREATE INDEX IF NOT EXISTS idx_dispensing_prescription ON dispensing_records(prescription_id);

-- 4. DELIVERY TRACKING
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_partner_name VARCHAR(255),
  tracking_number VARCHAR(255),
  tracking_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED')),
  estimated_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  delivery_address TEXT,
  recipient_name VARCHAR(255),
  recipient_phone VARCHAR(50),
  proof_of_delivery_url TEXT,
  delivery_notes TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_delivery_order ON delivery_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status ON delivery_tracking(status);

-- 5. PHARMACY OPERATING HOURS
CREATE TABLE IF NOT EXISTS pharmacy_operating_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pharmacy_id, day_of_week)
);

-- 6. PHARMACY STAFF AVAILABILITY
CREATE TABLE IF NOT EXISTS pharmacy_staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('AVAILABLE', 'BUSY', 'OFFLINE')),
  max_concurrent_chats INTEGER DEFAULT 5,
  current_chat_count INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pharmacy_id)
);

-- 7. PATIENT CONSENTS
CREATE TABLE IF NOT EXISTS patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN (
    'DATA_SHARING', 'PRESCRIPTION_STORAGE', 'CHAT_RECORDING',
    'MARKETING_EMAILS', 'SMS_NOTIFICATIONS', 'ANONYMOUS_DATA_RESEARCH',
    'INSURANCE_DATA_SHARING', 'TELEHEALTH_CONSENT'
  )),
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  version VARCHAR(10) DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, consent_type)
);
CREATE INDEX IF NOT EXISTS idx_consents_patient ON patient_consents(patient_id);

-- 8. REFILL REMINDERS
CREATE TABLE IF NOT EXISTS refill_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
  medicine_name VARCHAR(255) NOT NULL,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  days_before_refill INTEGER DEFAULT 5,
  next_refill_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SENT', 'COMPLETED', 'CANCELLED')),
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refill_patient ON refill_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_refill_next_date ON refill_reminders(next_refill_date);

-- 9. MEDICINE SUBSTITUTIONS
CREATE TABLE IF NOT EXISTS medicine_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  substitute_medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  therapeutic_equivalence VARCHAR(20) DEFAULT 'A' CHECK (therapeutic_equivalence IN ('A', 'B', 'C', 'D', 'X')),
  notes TEXT,
  pharmacist_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(original_medicine_id, substitute_medicine_id)
);
CREATE INDEX IF NOT EXISTS idx_subst_original ON medicine_substitutions(original_medicine_id);

-- 10. INSURANCE PROVIDERS
CREATE TABLE IF NOT EXISTS insurance_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website VARCHAR(500),
  api_endpoint VARCHAR(500),
  api_key_encrypted TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  supported_plan_types JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. INSURANCE CLAIMS
CREATE TABLE IF NOT EXISTS insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  insurance_provider_id UUID REFERENCES insurance_providers(id) ON DELETE SET NULL,
  policy_number VARCHAR(100),
  claim_number VARCHAR(100),
  total_amount NUMERIC(10,2) NOT NULL,
  covered_amount NUMERIC(10,2) DEFAULT 0,
  copay_amount NUMERIC(10,2) DEFAULT 0,
  patient_responsibility NUMERIC(10,2) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'PROCESSING', 'APPROVED', 'PARTIALLY_APPROVED', 'DENIED', 'APPEALED', 'PAID')),
  submitted_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  denial_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_claims_patient ON insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON insurance_claims(status);

-- 12. CONTROLLED SUBSTANCE REGISTER
CREATE TABLE IF NOT EXISTS controlled_substance_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  schedule VARCHAR(20) NOT NULL CHECK (schedule IN ('I', 'II', 'III', 'IV', 'V')),
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('RECEIVED', 'DISPENSED', 'RETURNED', 'DESTROYED', 'TRANSFERRED')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  batch_number VARCHAR(100),
  pharmacist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  witness_id UUID REFERENCES users(id),
  patient_id UUID REFERENCES users(id),
  prescription_id UUID REFERENCES prescriptions(id),
  order_id UUID REFERENCES orders(id),
  destination VARCHAR(255),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cs_medicine ON controlled_substance_register(medicine_id);
CREATE INDEX IF NOT EXISTS idx_cs_pharmacist ON controlled_substance_register(pharmacist_id);
CREATE INDEX IF NOT EXISTS idx_cs_schedule ON controlled_substance_register(schedule);
CREATE INDEX IF NOT EXISTS idx_cs_created ON controlled_substance_register(created_at);

-- 13. PHARMACY-TO-PHARMACY TRANSFERS
CREATE TABLE IF NOT EXISTS pharmacy_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  to_pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  stock_batch_id UUID REFERENCES stock_batches(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'REJECTED', 'CANCELLED')),
  requested_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  received_by UUID REFERENCES users(id),
  notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transfer_from ON pharmacy_transfers(from_pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_transfer_to ON pharmacy_transfers(to_pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_transfer_status ON pharmacy_transfers(status);

-- 14. PATIENT ADHERENCE TRACKING
CREATE TABLE IF NOT EXISTS patient_adherence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
  medicine_name VARCHAR(255) NOT NULL,
  scheduled_time TIME,
  scheduled_date DATE NOT NULL,
  taken BOOLEAN DEFAULT FALSE,
  taken_at TIMESTAMPTZ,
  skipped_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_adherence_patient ON patient_adherence(patient_id);
CREATE INDEX IF NOT EXISTS idx_adherence_date ON patient_adherence(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_adherence_taken ON patient_adherence(taken);

-- 15. PATIENT FEEDBACK / SATISFACTION
CREATE TABLE IF NOT EXISTS patient_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  feedback_type VARCHAR(30) NOT NULL CHECK (feedback_type IN ('ORDER', 'CONSULTATION', 'DELIVERY', 'GENERAL')),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feedback_patient ON patient_feedback(patient_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON patient_feedback(feedback_type);

-- 16. TELEHEALTH SESSIONS
CREATE TABLE IF NOT EXISTS telehealth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pharmacist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  room_id VARCHAR(255),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  recording_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_telehealth_patient ON telehealth_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_telehealth_pharmacist ON telehealth_sessions(pharmacist_id);
CREATE INDEX IF NOT EXISTS idx_telehealth_status ON telehealth_sessions(status);

-- 17. REGULATORY REPORTS
CREATE TABLE IF NOT EXISTS regulatory_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
    'MONTHLY_SALES', 'CONTROLLED_SUBSTANCE', 'EXPIRY_WASTE',
    'DISPENSING_LOG', 'ADVERSE_EVENTS', 'STOCK_RECONCILIATION',
    'STAFF_VERIFICATION', 'PATIENT_OUTCOMES'
  )),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'GENERATED', 'SUBMITTED', 'ACKNOWLEDGED')),
  file_url TEXT,
  generated_by UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reg_report_pharmacy ON regulatory_reports(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_reg_report_type ON regulatory_reports(report_type);

-- 18. INVENTORY REORDER SUGGESTIONS
CREATE TABLE IF NOT EXISTS inventory_reorder_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  current_stock INTEGER NOT NULL,
  reorder_level INTEGER NOT NULL,
  suggested_quantity INTEGER NOT NULL,
  preferred_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  estimated_cost NUMERIC(10,2),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'ORDERED', 'RECEIVED', 'DISMISSED')),
  approved_by UUID REFERENCES users(id),
  ordered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reorder_medicine ON inventory_reorder_suggestions(medicine_id);
CREATE INDEX IF NOT EXISTS idx_reorder_status ON inventory_reorder_suggestions(status);

-- 19. I18N TRANSLATIONS TABLE
CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale VARCHAR(10) NOT NULL,
  translation_key VARCHAR(255) NOT NULL,
  translation_value TEXT NOT NULL,
  context VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(locale, translation_key)
);
CREATE INDEX IF NOT EXISTS idx_translations_locale ON translations(locale);

-- 20. ANALYTICS SNAPSHOTS (Enhanced analytics)
CREATE TABLE IF NOT EXISTS analytics_daily_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  total_dispensed INTEGER DEFAULT 0,
  total_prescriptions_reviewed INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2),
  active_patients INTEGER DEFAULT 0,
  new_patients INTEGER DEFAULT 0,
  stock_alerts INTEGER DEFAULT 0,
  expiry_alerts INTEGER DEFAULT 0,
  chat_conversations INTEGER DEFAULT 0,
  average_response_time_minutes INTEGER,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pharmacy_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_snapshot_date ON analytics_daily_snapshot(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshot_pharmacy ON analytics_daily_snapshot(pharmacy_id);

-- Seed translations for Kinyarwanda, French, English
INSERT INTO translations (locale, translation_key, translation_value) VALUES
-- English
('en', 'app.welcome', 'Welcome to Urumuli'),
('en', 'app.login', 'Login'),
('en', 'app.register', 'Register'),
('en', 'app.dashboard', 'Dashboard'),
('en', 'app.medicines', 'Medicines'),
('en', 'app.prescriptions', 'Prescriptions'),
('en', 'app.orders', 'Orders'),
('en', 'app.chat', 'Chat'),
('en', 'app.profile', 'Profile'),
('en', 'app.settings', 'Settings'),
('en', 'app.logout', 'Logout'),
('en', 'app.search', 'Search'),
('en', 'app.notifications', 'Notifications'),
('en', 'app.inventory', 'Inventory'),
('en', 'app.sales', 'Sales'),
('en', 'app.analytics', 'Analytics'),
('en', 'app.staff', 'Staff'),
('en', 'app.pharmacies', 'Pharmacies'),
('en', 'app.orders.ready', 'Your order is ready for pickup'),
('en', 'app.prescription.approved', 'Your prescription has been approved'),
('en', 'app.prescription.rejected', 'Your prescription needs attention'),
('en', 'app.chat.response', 'A pharmacist has responded to your message'),
('en', 'app.refill.reminder', 'Time to refill your medication'),
('en', 'app.expiry.warning', 'Medicine expiring soon'),
('en', 'patient.login', 'Patient Login'),
('en', 'patient.register', 'Create Patient Account'),
('en', 'patient.dashboard', 'Patient Dashboard'),
('en', 'patient.medications', 'My Medications'),
('en', 'patient.orders', 'My Orders'),
('en', 'patient.chat', 'Chat with Pharmacist'),
('en', 'patient.prescriptions', 'My Prescriptions'),
-- Kinyarwanda
('rw', 'app.welcome', 'Murakaza neza kuri Urumuli'),
('rw', 'app.login', 'Injira'),
('rw', 'app.register', 'Iyandikishe'),
('rw', 'app.dashboard', 'Ibikorwa'),
('rw', 'app.medicines', 'Imiti'),
('rw', 'app.prescriptions', 'Amabwingirizo'),
('rw', 'app.orders', 'Amabiko'),
('rw', 'app.chat', 'Ikiyaga'),
('rw', 'app.profile', 'Umwirondoro'),
('rw', 'app.settings', 'Amategeko'),
('rw', 'app.logout', 'Sohoka'),
('rw', 'app.search', 'Rondera'),
('rw', 'app.notifications', 'Amakuru'),
('rw', 'app.inventory', 'Ibikoresho'),
('rw', 'app.sales', 'Kugurisha'),
('rw', 'app.analytics', 'Ibiharuro'),
('rw', 'app.staff', 'Abakozi'),
('rw', 'app.pharmacies', 'Ibitaro'),
('rw', 'app.orders.ready', 'Amabiko yawe arakwiye'),
('rw', 'app.prescription.approved', 'Amabwingirizo yawe yemewe'),
('rw', 'app.prescription.rejected', 'Amabwingirizo yawe akwiye ubusobanuro'),
('rw', 'app.chat.response', 'Farumasi yanditse iyiMessage'),
('rw', 'app.refill.reminder', 'Igihe cyo gutanga imiti'),
('rw', 'app.expiry.warning', 'Imiti iri gutegerezwa'),
('rw', 'patient.login', 'Injira nk''umugenzi'),
('rw', 'patient.register', 'Iyandikishe nk''umugenzi'),
('rw', 'patient.dashboard', 'Ibikorwa vy''umugenzi'),
('rw', 'patient.medications', 'Imiti yanje'),
('rw', 'patient.orders', 'Amabiko yanje'),
('rw', 'patient.chat', 'Kega na Farumasi'),
('rw', 'patient.prescriptions', 'Amabwingirizo yanje'),
-- French
('fr', 'app.welcome', 'Bienvenue sur Urumuli'),
('fr', 'app.login', 'Connexion'),
('fr', 'app.register', 'Inscription'),
('fr', 'app.dashboard', 'Tableau de bord'),
('fr', 'app.medicines', 'Medicaments'),
('fr', 'app.prescriptions', 'Ordonnances'),
('fr', 'app.orders', 'Commandes'),
('fr', 'app.chat', 'Discussion'),
('fr', 'app.profile', 'Profil'),
('fr', 'app.settings', 'Parametres'),
('fr', 'app.logout', 'Deconnexion'),
('fr', 'app.search', 'Rechercher'),
('fr', 'app.notifications', 'Notifications'),
('fr', 'app.inventory', 'Inventaire'),
('fr', 'app.sales', 'Ventes'),
('fr', 'app.analytics', 'Analytique'),
('fr', 'app.staff', 'Personnel'),
('fr', 'app.pharmacies', 'Pharmacies'),
('fr', 'app.orders.ready', 'Votre commande est prete'),
('fr', 'app.prescription.approved', 'Votre ordonnance est approuvee'),
('fr', 'app.prescription.rejected', 'Votre ordonnance necessite attention'),
('fr', 'app.chat.response', 'Un pharmacien a repondu a votre message'),
('fr', 'app.refill.reminder', 'Temps de renouveler votre medicament'),
('fr', 'app.expiry.warning', 'Medicament bientot perime'),
('fr', 'patient.login', 'Connexion patient'),
('fr', 'patient.register', 'Creer un compte patient'),
('fr', 'patient.dashboard', 'Tableau de bord patient'),
('fr', 'patient.medications', 'Mes medicaments'),
('fr', 'patient.orders', 'Mes commandes'),
('fr', 'patient.chat', 'Discuter avec le pharmacien'),
('fr', 'patient.prescriptions', 'Mes ordonnances')
ON CONFLICT (locale, translation_key) DO UPDATE SET
  translation_value = EXCLUDED.translation_value,
  updated_at = NOW();

-- Seed pharmacy operating hours (default: Mon-Sat 8am-6pm, Sun closed)
-- This will be applied when a new pharmacy is created via a trigger-like pattern
-- For now, seed a helper function
CREATE OR REPLACE FUNCTION seed_default_operating_hours(p_pharmacy_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO pharmacy_operating_hours (pharmacy_id, day_of_week, open_time, close_time, is_closed)
  VALUES
    (p_pharmacy_id, 0, '09:00', '13:00', FALSE),
    (p_pharmacy_id, 1, '08:00', '18:00', FALSE),
    (p_pharmacy_id, 2, '08:00', '18:00', FALSE),
    (p_pharmacy_id, 3, '08:00', '18:00', FALSE),
    (p_pharmacy_id, 4, '08:00', '18:00', FALSE),
    (p_pharmacy_id, 5, '08:00', '18:00', FALSE),
    (p_pharmacy_id, 6, '08:00', '12:00', FALSE)
  ON CONFLICT (pharmacy_id, day_of_week) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Seed default substitutions (common therapeutic equivalents)
INSERT INTO medicine_substitutions (original_medicine_id, substitute_medicine_id, therapeutic_equivalence, notes)
SELECT m1.id, m2.id, 'A', 'Common therapeutic equivalent'
FROM medicines m1, medicines m2
WHERE m1.generic_name = m2.generic_name
  AND m1.id <> m2.id
  AND m1.generic_name IS NOT NULL
  AND m1.generic_name <> ''
ON CONFLICT (original_medicine_id, substitute_medicine_id) DO NOTHING;
