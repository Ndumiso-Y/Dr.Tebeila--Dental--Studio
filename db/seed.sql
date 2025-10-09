-- Dr.Tebeila Dental Studio - Seed Data (SaaS Multi-tenant)
-- PostgreSQL (Supabase)
-- Version: 2.0 - Multi-tenant SaaS
-- Date: 2025-10-09

-- ============================================================================
-- SEED TENANT: Dr.Tebeila Dental Studio
-- ============================================================================

DO $$
DECLARE
    v_tenant_id UUID;
    v_vat_15_id UUID;
    v_vat_0_id UUID;
    v_unit_service_id UUID;
    v_unit_hour_id UUID;
    v_unit_unit_id UUID;
BEGIN
    -- Create tenant
    INSERT INTO tenants (
        name,
        slug,
        business_name,
        vat_number,
        email,
        phone,
        address,
        city,
        postal_code,
        country,
        default_currency,
        invoice_prefix,
        primary_color,
        secondary_color,
        is_active
    ) VALUES (
        'Dr.Tebeila Dental Studio',
        'dr-tebeila-dental-studio',
        'Dr.Tebeila Dental Studio (Pty) Ltd',
        '4123456789', -- Example VAT number
        'info@drtebeila.co.za',
        '+27 12 345 6789',
        '123 Medical Centre, Pretoria Road',
        'Johannesburg',
        '2000',
        'South Africa',
        'ZAR',
        'DEV',
        '#05984B',
        '#0E8ECC',
        true
    ) RETURNING id INTO v_tenant_id;

    -- ========================================================================
    -- VAT RATES
    -- ========================================================================

    -- Standard VAT (15%)
    INSERT INTO vat_rates (tenant_id, name, rate, is_default, is_active)
    VALUES (v_tenant_id, 'Standard VAT (15%)', 15.00, true, true)
    RETURNING id INTO v_vat_15_id;

    -- Zero-rated (0%)
    INSERT INTO vat_rates (tenant_id, name, rate, is_default, is_active)
    VALUES (v_tenant_id, 'Zero-rated (0%)', 0.00, false, true)
    RETURNING id INTO v_vat_0_id;

    -- Update tenant default VAT rate
    UPDATE tenants SET default_vat_rate_id = v_vat_15_id WHERE id = v_tenant_id;

    -- ========================================================================
    -- UNITS OF MEASUREMENT
    -- ========================================================================

    INSERT INTO units (tenant_id, name, abbreviation, is_active)
    VALUES (v_tenant_id, 'Service', 'svc', true)
    RETURNING id INTO v_unit_service_id;

    INSERT INTO units (tenant_id, name, abbreviation, is_active)
    VALUES (v_tenant_id, 'Hour', 'hr', true)
    RETURNING id INTO v_unit_hour_id;

    INSERT INTO units (tenant_id, name, abbreviation, is_active)
    VALUES (v_tenant_id, 'Unit', 'ea', true)
    RETURNING id INTO v_unit_unit_id;

    -- ========================================================================
    -- SERVICES CATALOG (16 Core Dental Services)
    -- ========================================================================

    -- 1. Consultation
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'CONS-01',
        'Dental Consultation',
        'Initial consultation and oral examination',
        350.00,
        v_unit_service_id,
        v_vat_15_id,
        true
    );

    -- 2. Scale and Polish
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'CLEAN-01',
        'Scale & Polish',
        'Professional teeth cleaning and polishing',
        650.00,
        v_unit_service_id,
        v_vat_15_id,
        true
    );

    -- 3. X-Ray
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'XRAY-01',
        'Dental X-Ray',
        'Periapical or bitewing radiograph',
        250.00,
        v_unit_unit_id,
        v_vat_15_id,
        true
    );

    -- 4. Composite Filling
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'FIL-COMP',
        'Composite Filling',
        'Tooth-colored filling (per surface)',
        650.00,
        v_unit_service_id,
        v_vat_15_id,
        true
    );

    -- 5. Amalgam Filling
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'FIL-AMAL',
        'Amalgam Filling',
        'Silver filling (per surface)',
        550.00,
        v_unit_service_id,
        v_vat_15_id,
        true
    );

    -- 6. Root Canal Treatment
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'RCT-01',
        'Root Canal Treatment',
        'Endodontic therapy (per canal)',
        3500.00,
        v_unit_service_id,
        v_vat_15_id,
        true
    );

    -- 7. Crown (Porcelain)
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'CROWN-PFM',
        'Porcelain Crown',
        'Porcelain fused to metal crown',
        5500.00,
        v_unit_unit_id,
        v_vat_15_id,
        true
    );

    -- 8. Extraction (Simple)
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'EXT-SIMP',
        'Simple Extraction',
        'Routine tooth extraction',
        850.00,
        v_unit_service_id,
        v_vat_15_id,
        true
    );

    -- 9. Extraction (Surgical)
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'EXT-SURG',
        'Surgical Extraction',
        'Complex tooth extraction requiring surgery',
        1800.00,
        v_unit_service_id,
        v_vat_15_id,
        true
    );

    -- 10. Teeth Whitening
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'WHITEN-01',
        'Teeth Whitening',
        'Professional in-office whitening treatment',
        4500.00,
        v_unit_service_id,
        v_vat_15_id,
        true
    );

    -- 11. Veneer
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'VENEER-01',
        'Porcelain Veneer',
        'Ceramic veneer (per tooth)',
        8500.00,
        v_unit_unit_id,
        v_vat_15_id,
        true
    );

    -- 12. Denture (Full)
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'DENT-FULL',
        'Complete Denture',
        'Full acrylic denture (per arch)',
        7500.00,
        v_unit_unit_id,
        v_vat_15_id,
        true
    );

    -- 13. Denture (Partial)
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'DENT-PART',
        'Partial Denture',
        'Removable partial denture',
        4500.00,
        v_unit_unit_id,
        v_vat_15_id,
        true
    );

    -- 14. Dental Implant
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'IMPLANT-01',
        'Dental Implant',
        'Titanium implant fixture (per implant)',
        18000.00,
        v_unit_unit_id,
        v_vat_15_id,
        true
    );

    -- 15. Emergency Treatment
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'EMERG-01',
        'Emergency Treatment',
        'After-hours emergency consultation and pain relief',
        1200.00,
        v_unit_service_id,
        v_vat_15_id,
        true
    );

    -- 16. Fluoride Treatment
    INSERT INTO services (tenant_id, code, name, description, unit_price, unit_id, vat_rate_id, is_active)
    VALUES (
        v_tenant_id,
        'FLUOR-01',
        'Fluoride Treatment',
        'Topical fluoride application',
        250.00,
        v_unit_service_id,
        v_vat_15_id,
        true
    );

    -- ========================================================================
    -- SAMPLE CUSTOMER (for testing)
    -- ========================================================================

    INSERT INTO customers (tenant_id, name, email, phone, address, city, postal_code, country, is_active)
    VALUES (
        v_tenant_id,
        'John Doe',
        'john.doe@example.com',
        '+27 82 123 4567',
        '456 Main Street',
        'Johannesburg',
        '2001',
        'South Africa',
        true
    );

    INSERT INTO customers (tenant_id, name, email, phone, address, city, postal_code, country, is_active)
    VALUES (
        v_tenant_id,
        'Jane Smith',
        'jane.smith@example.com',
        '+27 83 987 6543',
        '789 Oak Avenue',
        'Pretoria',
        '0001',
        'South Africa',
        true
    );

    -- ========================================================================
    -- INITIALIZE INVOICE COUNTER (for current year)
    -- ========================================================================

    INSERT INTO invoice_counters (tenant_id, year, last_number)
    VALUES (v_tenant_id, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 0);

    -- ========================================================================
    -- OUTPUT SUMMARY
    -- ========================================================================

    RAISE NOTICE '============================================================';
    RAISE NOTICE 'SEED DATA LOADED SUCCESSFULLY';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Tenant: Dr.Tebeila Dental Studio';
    RAISE NOTICE 'Tenant ID: %', v_tenant_id;
    RAISE NOTICE 'VAT Rates: 2 (15%%, 0%%)';
    RAISE NOTICE 'Units: 3 (Service, Hour, Unit)';
    RAISE NOTICE 'Services: 16 dental procedures';
    RAISE NOTICE 'Sample Customers: 2';
    RAISE NOTICE 'Invoice Counter: Initialized for year %', EXTRACT(YEAR FROM CURRENT_DATE);
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Create first user in Supabase Auth';
    RAISE NOTICE '2. Insert user_profile with tenant_id = %', v_tenant_id;
    RAISE NOTICE '3. Set role = ''owner'' for first user';
    RAISE NOTICE '============================================================';

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these after seeding to verify data:

-- SELECT * FROM tenants;
-- SELECT * FROM vat_rates;
-- SELECT * FROM units;
-- SELECT * FROM services ORDER BY code;
-- SELECT * FROM customers;
-- SELECT * FROM invoice_counters;

-- ============================================================================
-- SAMPLE USER PROFILE INSERTION (after creating auth user)
-- ============================================================================

-- After creating a user via Supabase Auth, insert their profile:
--
-- INSERT INTO user_profiles (id, tenant_id, full_name, role, email, phone, is_active)
-- VALUES (
--     '<AUTH_USER_ID>', -- Get from auth.users table
--     '<TENANT_ID>',    -- Get from tenants table
--     'Dr. Tebeila',
--     'owner',
--     'doctor@drtebeila.co.za',
--     '+27 12 345 6789',
--     true
-- );

-- ============================================================================
-- NOTES
-- ============================================================================

-- Prices (ZAR - South African Rand):
-- - Consultation: R350
-- - Scale & Polish: R650
-- - X-Ray: R250
-- - Composite Filling: R650
-- - Amalgam Filling: R550
-- - Root Canal: R3,500
-- - Crown: R5,500
-- - Simple Extraction: R850
-- - Surgical Extraction: R1,800
-- - Teeth Whitening: R4,500
-- - Veneer: R8,500
-- - Full Denture: R7,500
-- - Partial Denture: R4,500
-- - Dental Implant: R18,000
-- - Emergency: R1,200
-- - Fluoride: R250

-- All prices include 15% VAT by default (Standard VAT rate)
-- Zero-rated (0%) available for medical aid claims or exempt services

-- Brand Colors:
-- - Primary: #05984B (Green)
-- - Secondary: #0E8ECC (Blue)

-- Invoice Numbering:
-- - Format: DEV-YYYY-NNNN
-- - Example: DEV-2025-0001, DEV-2025-0002, etc.
-- - Resets annually
-- - Assigned only at finalize (Draft invoices have NULL invoice_number)

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
