-- Dr.Tebeila Dental Studio - Database Schema (SaaS Invoicing)
-- PostgreSQL (Supabase)
-- Version: 2.0 - Multi-tenant SaaS
-- Date: 2025-10-09

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('owner', 'admin', 'staff');
CREATE TYPE invoice_status AS ENUM ('Draft', 'ProformaOffline', 'Finalized', 'Paid', 'Void');
CREATE TYPE audit_action AS ENUM ('finalize', 'mark_paid', 'void', 'create', 'update', 'delete');

-- ============================================================================
-- MULTI-TENANT CORE TABLES
-- ============================================================================

-- Tenants (Organizations)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,

    -- Business Info
    business_name TEXT,
    vat_number TEXT,
    registration_number TEXT,

    -- Contact Details
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'South Africa',

    -- Settings
    default_currency TEXT DEFAULT 'ZAR',
    default_vat_rate_id UUID, -- FK to vat_rates, set after creation
    invoice_prefix TEXT DEFAULT 'DEV', -- DEV-2025-0001

    -- Brand Colors
    primary_color TEXT DEFAULT '#05984B',
    secondary_color TEXT DEFAULT '#0E8ECC',

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_is_active ON tenants(is_active);

-- User Profiles (extends auth.users) - linked to tenant
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'staff',
    email TEXT,
    phone TEXT,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_tenant_id ON user_profiles(tenant_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- VAT Rates (per tenant)
CREATE TABLE vat_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    name TEXT NOT NULL, -- e.g., "Standard VAT", "Zero-rated", "Exempt"
    rate DECIMAL(5, 2) NOT NULL, -- e.g., 15.00, 0.00
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_vat_rates_tenant_id ON vat_rates(tenant_id);
CREATE INDEX idx_vat_rates_is_default ON vat_rates(tenant_id, is_default) WHERE is_default = true;

-- Units of Measurement (per tenant)
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    name TEXT NOT NULL, -- e.g., "Hour", "Unit", "Service"
    abbreviation TEXT NOT NULL, -- e.g., "hr", "ea", "svc"
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_units_tenant_id ON units(tenant_id);

-- Services/Products Catalog (per tenant)
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    code TEXT NOT NULL, -- e.g., "CONS-01", "FIL-COMP"
    name TEXT NOT NULL,
    description TEXT,

    -- Pricing
    unit_price DECIMAL(10, 2) NOT NULL,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    vat_rate_id UUID REFERENCES vat_rates(id) ON DELETE SET NULL,

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_services_tenant_id ON services(tenant_id);
CREATE INDEX idx_services_code ON services(tenant_id, code);
CREATE INDEX idx_services_is_active ON services(tenant_id, is_active);

-- Customers (per tenant)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Basic Info
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,

    -- Billing Address
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT,

    -- Tax Info
    vat_number TEXT,

    -- Metadata
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_name ON customers(tenant_id, name);
CREATE INDEX idx_customers_email ON customers(tenant_id, email);

-- Invoice Counters (per tenant, per year)
CREATE TABLE invoice_counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    year INTEGER NOT NULL,
    last_number INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id, year)
);

CREATE INDEX idx_invoice_counters_tenant_year ON invoice_counters(tenant_id, year);

-- Invoices (per tenant)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Invoice Number (DEV-2025-0001) - assigned at finalize
    invoice_number TEXT,

    -- Customer
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,

    -- Dates
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,

    -- Status
    status invoice_status DEFAULT 'Draft',

    -- Financial
    subtotal DECIMAL(10, 2) DEFAULT 0.00,
    total_vat DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) DEFAULT 0.00,

    -- Payment
    paid_amount DECIMAL(10, 2) DEFAULT 0.00,
    paid_date DATE,
    payment_reference TEXT,

    -- Notes
    notes TEXT,
    terms TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    -- Finalized timestamp
    finalized_at TIMESTAMPTZ,
    finalized_by UUID REFERENCES auth.users(id),

    -- Constraints
    CONSTRAINT chk_invoice_number_on_finalize CHECK (
        (status = 'Draft' AND invoice_number IS NULL) OR
        (status != 'Draft' AND invoice_number IS NOT NULL)
    )
);

CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_customer_id ON invoices(tenant_id, customer_id);
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_invoice_number ON invoices(tenant_id, invoice_number);
CREATE INDEX idx_invoices_invoice_date ON invoices(tenant_id, invoice_date);
CREATE INDEX idx_invoices_created_at ON invoices(tenant_id, created_at);
CREATE UNIQUE INDEX idx_invoices_number_unique ON invoices(tenant_id, invoice_number) WHERE invoice_number IS NOT NULL;

-- Invoice Items (normalized, per invoice)
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

    -- Line Item Details
    line_order INTEGER NOT NULL DEFAULT 0,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,

    -- Description (can override service name)
    description TEXT NOT NULL,

    -- Quantity & Pricing
    quantity DECIMAL(10, 3) DEFAULT 1.000,
    unit_price DECIMAL(10, 2) NOT NULL,

    -- VAT
    vat_rate_id UUID REFERENCES vat_rates(id) ON DELETE SET NULL,
    vat_rate DECIMAL(5, 2) DEFAULT 0.00, -- Stored at time of invoice
    vat_amount DECIMAL(10, 2) DEFAULT 0.00,

    -- Totals
    line_total DECIMAL(10, 2) NOT NULL, -- (quantity * unit_price)
    line_total_incl_vat DECIMAL(10, 2) NOT NULL, -- line_total + vat_amount

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_tenant_id ON invoice_items(tenant_id);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_service_id ON invoice_items(service_id);
CREATE INDEX idx_invoice_items_line_order ON invoice_items(invoice_id, line_order);

-- Audit Log (per tenant)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Action Details
    action audit_action NOT NULL,
    entity_type TEXT NOT NULL, -- 'invoice', 'customer', 'service', etc.
    entity_id UUID NOT NULL,

    -- Changes (JSONB for flexibility)
    old_values JSONB,
    new_values JSONB,

    -- User & Timestamp
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Additional Context
    ip_address TEXT,
    user_agent TEXT,
    notes TEXT
);

CREATE INDEX idx_audit_log_tenant_id ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_entity ON audit_log(tenant_id, entity_type, entity_id);
CREATE INDEX idx_audit_log_performed_at ON audit_log(tenant_id, performed_at);
CREATE INDEX idx_audit_log_action ON audit_log(tenant_id, action);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vat_rates_updated_at BEFORE UPDATE ON vat_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_counters_updated_at BEFORE UPDATE ON invoice_counters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate invoice totals when items change
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate line totals
    NEW.line_total = NEW.quantity * NEW.unit_price;
    NEW.vat_amount = ROUND(NEW.line_total * (NEW.vat_rate / 100), 2);
    NEW.line_total_incl_vat = NEW.line_total + NEW.vat_amount;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_invoice_item_totals
BEFORE INSERT OR UPDATE ON invoice_items
FOR EACH ROW
EXECUTE FUNCTION calculate_invoice_totals();

-- Update invoice totals after item changes
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
BEGIN
    -- Get invoice_id from NEW or OLD
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    -- Recalculate invoice totals
    UPDATE invoices
    SET
        subtotal = COALESCE((
            SELECT SUM(line_total)
            FROM invoice_items
            WHERE invoice_id = v_invoice_id
        ), 0.00),
        total_vat = COALESCE((
            SELECT SUM(vat_amount)
            FROM invoice_items
            WHERE invoice_id = v_invoice_id
        ), 0.00),
        total_amount = COALESCE((
            SELECT SUM(line_total_incl_vat)
            FROM invoice_items
            WHERE invoice_id = v_invoice_id
        ), 0.00)
    WHERE id = v_invoice_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_totals_on_item_change
AFTER INSERT OR UPDATE OR DELETE ON invoice_items
FOR EACH ROW
EXECUTE FUNCTION update_invoice_totals();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get tenant_id from JWT
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Generate next invoice number (stub - full logic in T6)
CREATE OR REPLACE FUNCTION generate_invoice_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_year INTEGER;
    v_next_number INTEGER;
    v_invoice_number TEXT;
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Get or create counter for this year
    INSERT INTO invoice_counters (tenant_id, year, last_number)
    VALUES (p_tenant_id, v_year, 1)
    ON CONFLICT (tenant_id, year)
    DO UPDATE SET last_number = invoice_counters.last_number + 1
    RETURNING last_number INTO v_next_number;

    -- Format: DEV-2025-0001
    v_invoice_number := 'DEV-' || v_year || '-' || LPAD(v_next_number::TEXT, 4, '0');

    RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE tenants IS 'Multi-tenant organizations (practices/businesses)';
COMMENT ON TABLE user_profiles IS 'User profiles linked to tenants with role-based access';
COMMENT ON TABLE vat_rates IS 'VAT/tax rates per tenant (15%, 0%, etc.)';
COMMENT ON TABLE units IS 'Units of measurement (hour, unit, service, etc.)';
COMMENT ON TABLE services IS 'Service/product catalog per tenant';
COMMENT ON TABLE customers IS 'Customer directory per tenant';
COMMENT ON TABLE invoice_counters IS 'Auto-incrementing invoice numbers per tenant per year';
COMMENT ON TABLE invoices IS 'Invoice header with status tracking (Draft → ProformaOffline → Finalized → Paid → Void)';
COMMENT ON TABLE invoice_items IS 'Normalized invoice line items';
COMMENT ON TABLE audit_log IS 'Audit trail for critical operations (finalize, mark_paid, void)';

COMMENT ON COLUMN invoices.invoice_number IS 'DEV-YYYY-NNNN format, assigned only at finalize';
COMMENT ON COLUMN invoices.status IS 'Draft | ProformaOffline | Finalized | Paid | Void';
COMMENT ON CONSTRAINT chk_invoice_number_on_finalize ON invoices IS 'Draft invoices must have NULL invoice_number';
