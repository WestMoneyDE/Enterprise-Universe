-- West Money Bau Database Schema
-- Version: 1.0.0
-- Date: 2026-01-11

-- Create schema
CREATE SCHEMA IF NOT EXISTS bau;

-- Customers table
CREATE TABLE IF NOT EXISTS bau.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    company VARCHAR(255),
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_zip VARCHAR(20),
    customer_type VARCHAR(50) DEFAULT 'private', -- private, commercial, investor
    hubspot_contact_id VARCHAR(50),
    stripe_customer_id VARCHAR(50),
    whatsapp_consent BOOLEAN DEFAULT FALSE,
    email_consent BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS bau.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES bau.customers(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(50), -- smart_home, barrier_free, security, mixed
    building_type VARCHAR(50), -- new_build, renovation, commercial
    status VARCHAR(50) DEFAULT 'inquiry', -- inquiry, consultation, quote, negotiation, approved, in_progress, acceptance, completed, cancelled
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_zip VARCHAR(20),
    square_meters INTEGER,
    estimated_value DECIMAL(12,2),
    actual_value DECIMAL(12,2),
    deposit_amount DECIMAL(12,2),
    deposit_paid BOOLEAN DEFAULT FALSE,
    start_date DATE,
    end_date DATE,
    hubspot_deal_id VARCHAR(50),
    assigned_manager VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subcontractors table (CRITICAL)
CREATE TABLE IF NOT EXISTS bau.subcontractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(50),
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    address VARCHAR(255),
    specializations TEXT[], -- electrical, plumbing, smart_home, security, construction, hvac, carpentry
    experience_years INTEGER,
    certifications TEXT[],
    languages TEXT[] DEFAULT ARRAY['de'],
    hourly_rate DECIMAL(10,2),
    daily_rate DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    rating DECIMAL(3,2) DEFAULT 0,
    total_projects INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- pending, verified, approved, rejected, suspended
    verification_status VARCHAR(50) DEFAULT 'unverified', -- unverified, documents_submitted, background_check, verified
    documents JSONB DEFAULT '{}', -- {cv: url, certifications: [urls], insurance: url, id: url, trade_license: url}
    bank_details JSONB DEFAULT '{}', -- {iban, bic, account_holder, bank_name}
    availability_status VARCHAR(50) DEFAULT 'available', -- available, busy, on_project, unavailable
    available_from DATE,
    travel_radius_km INTEGER DEFAULT 50,
    stripe_connect_id VARCHAR(100),
    stripe_connect_status VARCHAR(50), -- pending, active, restricted
    hubspot_contact_id VARCHAR(50),
    profile_photo_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    notes TEXT,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subcontractor Applications (recruitment workflow)
CREATE TABLE IF NOT EXISTS bau.subcontractor_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(50),
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    specializations TEXT[],
    experience_years INTEGER,
    hourly_rate_expected DECIMAL(10,2),
    portfolio_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    motivation TEXT,
    how_found_us VARCHAR(100), -- google, linkedin, referral, job_board, social_media, other
    referral_code VARCHAR(50),
    status VARCHAR(50) DEFAULT 'new', -- new, reviewing, documents_requested, interview_scheduled, approved, rejected
    documents JSONB DEFAULT '{}',
    reviewer_id VARCHAR(100),
    reviewer_notes TEXT,
    rejection_reason TEXT,
    interview_date TIMESTAMP,
    interview_notes TEXT,
    converted_to_subcontractor_id UUID REFERENCES bau.subcontractors(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP
);

-- Project Assignments (linking projects to subcontractors)
CREATE TABLE IF NOT EXISTS bau.project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES bau.projects(id) ON DELETE CASCADE,
    subcontractor_id UUID REFERENCES bau.subcontractors(id) ON DELETE SET NULL,
    role VARCHAR(100), -- lead_installer, electrician, plumber, assistant
    scope_of_work TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, declined, in_progress, completed, cancelled
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_deadline TIMESTAMP,
    accepted_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    agreed_rate DECIMAL(10,2),
    rate_type VARCHAR(20) DEFAULT 'hourly', -- hourly, daily, fixed
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2),
    total_payment DECIMAL(12,2),
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, invoiced, processing, paid
    performance_rating INTEGER, -- 1-5
    feedback TEXT,
    notes TEXT
);

-- Payments table
CREATE TABLE IF NOT EXISTS bau.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_type VARCHAR(50) NOT NULL, -- customer_invoice, customer_deposit, subcontractor_payment, refund
    reference_type VARCHAR(50), -- project, assignment
    reference_id UUID,
    customer_id UUID REFERENCES bau.customers(id),
    subcontractor_id UUID REFERENCES bau.subcontractors(id),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    platform_fee DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2),
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, refunded, cancelled
    stripe_payment_intent_id VARCHAR(100),
    stripe_invoice_id VARCHAR(100),
    stripe_transfer_id VARCHAR(100),
    stripe_payout_id VARCHAR(100),
    invoice_number VARCHAR(50),
    invoice_pdf_url VARCHAR(500),
    due_date DATE,
    paid_at TIMESTAMP,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contracts table
CREATE TABLE IF NOT EXISTS bau.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_type VARCHAR(50) NOT NULL, -- customer_project, subcontractor_framework, project_assignment, maintenance
    reference_type VARCHAR(50),
    reference_id UUID,
    customer_id UUID REFERENCES bau.customers(id),
    subcontractor_id UUID REFERENCES bau.subcontractors(id),
    template_id VARCHAR(50),
    contract_number VARCHAR(50) UNIQUE,
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, viewed, signed, active, expired, terminated
    pdf_url VARCHAR(500),
    signed_pdf_url VARCHAR(500),
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    signed_at TIMESTAMP,
    signature_data JSONB, -- {ip, user_agent, signature_image}
    valid_from DATE,
    valid_until DATE,
    auto_renew BOOLEAN DEFAULT FALSE,
    termination_notice_days INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LOXONE Projects table (Smart Home specific)
CREATE TABLE IF NOT EXISTS bau.loxone_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES bau.projects(id) ON DELETE CASCADE,
    miniserver_serial VARCHAR(100),
    miniserver_ip VARCHAR(50),
    miniserver_version VARCHAR(50),
    components JSONB DEFAULT '{}', -- {lighting: 15, shading: 8, climate: 4, security: 6, audio: 4}
    features TEXT[], -- lighting_control, audio_multiroom, climate, security, intercom, shading, weather
    rooms JSONB DEFAULT '[]', -- [{name, type, components}]
    scenes JSONB DEFAULT '[]', -- [{name, description, triggers}]
    installation_date DATE,
    commissioning_date DATE,
    warranty_until DATE,
    maintenance_contract BOOLEAN DEFAULT FALSE,
    maintenance_interval_months INTEGER DEFAULT 12,
    last_maintenance DATE,
    next_maintenance DATE,
    remote_access_enabled BOOLEAN DEFAULT FALSE,
    cloud_connected BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Log
CREATE TABLE IF NOT EXISTS bau.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- project, customer, subcontractor, payment, contract
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- created, updated, status_changed, assigned, completed
    actor_type VARCHAR(50), -- admin, customer, subcontractor, system
    actor_id VARCHAR(100),
    actor_name VARCHAR(255),
    description TEXT,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS bau.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_type VARCHAR(50) NOT NULL, -- admin, customer, subcontractor
    recipient_id UUID,
    recipient_email VARCHAR(255),
    channel VARCHAR(50) NOT NULL, -- email, whatsapp, sms, push, in_app
    template VARCHAR(100),
    subject VARCHAR(255),
    content TEXT,
    data JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed, read
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON bau.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_hubspot ON bau.customers(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON bau.projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON bau.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_type ON bau.projects(project_type);
CREATE INDEX IF NOT EXISTS idx_subcontractors_email ON bau.subcontractors(email);
CREATE INDEX IF NOT EXISTS idx_subcontractors_status ON bau.subcontractors(status);
CREATE INDEX IF NOT EXISTS idx_subcontractors_country ON bau.subcontractors(country);
CREATE INDEX IF NOT EXISTS idx_subcontractors_availability ON bau.subcontractors(availability_status);
CREATE INDEX IF NOT EXISTS idx_applications_status ON bau.subcontractor_applications(status);
CREATE INDEX IF NOT EXISTS idx_assignments_project ON bau.project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subcontractor ON bau.project_assignments(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON bau.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON bau.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_subcontractor ON bau.payments(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON bau.activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON bau.notifications(recipient_type, recipient_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION bau.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON bau.customers FOR EACH ROW EXECUTE FUNCTION bau.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON bau.projects FOR EACH ROW EXECUTE FUNCTION bau.update_updated_at_column();
CREATE TRIGGER update_subcontractors_updated_at BEFORE UPDATE ON bau.subcontractors FOR EACH ROW EXECUTE FUNCTION bau.update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON bau.contracts FOR EACH ROW EXECUTE FUNCTION bau.update_updated_at_column();
CREATE TRIGGER update_loxone_projects_updated_at BEFORE UPDATE ON bau.loxone_projects FOR EACH ROW EXECUTE FUNCTION bau.update_updated_at_column();

-- Generate project number function
CREATE OR REPLACE FUNCTION bau.generate_project_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.project_number = 'WMB-' || TO_CHAR(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('bau.project_number_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE IF NOT EXISTS bau.project_number_seq START 1;
CREATE TRIGGER generate_project_number_trigger BEFORE INSERT ON bau.projects FOR EACH ROW WHEN (NEW.project_number IS NULL) EXECUTE FUNCTION bau.generate_project_number();

-- Generate contract number function
CREATE OR REPLACE FUNCTION bau.generate_contract_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.contract_number = 'WMB-V-' || TO_CHAR(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('bau.contract_number_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE IF NOT EXISTS bau.contract_number_seq START 1;
CREATE TRIGGER generate_contract_number_trigger BEFORE INSERT ON bau.contracts FOR EACH ROW WHEN (NEW.contract_number IS NULL) EXECUTE FUNCTION bau.generate_contract_number();

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA bau TO westmoney;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA bau TO westmoney;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA bau TO westmoney;
