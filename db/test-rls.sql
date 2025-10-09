-- RLS Testing Suite - Multi-tenant Isolation & Role-based Access
-- =================================================================
-- Tests Row Level Security policies and tenant isolation
-- Run these queries AFTER authentication (as different users)

-- ============================================================================
-- SETUP: Create Test Data
-- ============================================================================

-- This section creates a second tenant and users for testing cross-tenant isolation
-- Run this ONCE before testing

DO $$
DECLARE
    tenant1_id UUID;
    tenant2_id UUID;
BEGIN
    -- Get Dr.Tebeila tenant ID
    SELECT id INTO tenant1_id FROM tenants WHERE slug = 'dr-tebeila-dental-studio';

    -- Create second test tenant
    INSERT INTO tenants (name, slug, business_name, primary_color, secondary_color)
    VALUES ('Test Clinic', 'test-clinic', 'Test Clinic Ltd', '#FF0000', '#0000FF')
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO tenant2_id;

    -- If tenant already exists, get its ID
    IF tenant2_id IS NULL THEN
        SELECT id INTO tenant2_id FROM tenants WHERE slug = 'test-clinic';
    END IF;

    -- Add test service to Test Clinic
    INSERT INTO services (tenant_id, code, name, description, unit_price, is_active)
    VALUES (
        tenant2_id,
        'TEST-01',
        'Test Service',
        'This should NOT be visible to Dr.Tebeila users',
        100.00,
        true
    ) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Test data created:';
    RAISE NOTICE '  Tenant 1 (Dr.Tebeila): %', tenant1_id;
    RAISE NOTICE '  Tenant 2 (Test Clinic): %', tenant2_id;
END $$;

-- ============================================================================
-- TEST 1: Verify Current User Context
-- ============================================================================

-- Check who you are logged in as
SELECT
    auth.uid() AS user_id,
    get_user_tenant_id() AS tenant_id,
    get_user_role() AS role,
    is_owner() AS is_owner,
    is_admin_or_owner() AS is_admin;

-- Expected: Returns your user details with tenant_id populated

-- Debug JWT claims
SELECT debug_jwt_claims();

-- Expected: Shows tenant_id and user_role in JWT

-- ============================================================================
-- TEST 2: Tenant Isolation - Read Operations
-- ============================================================================

-- Test: Can only see own tenant
SELECT id, name, slug FROM tenants;
-- Expected: 1 row (your tenant only)

-- Test: Can only see own tenant's services
SELECT id, code, name, tenant_id FROM services ORDER BY code;
-- Expected: Only services for your tenant (NOT Test Clinic's service)

-- Test: Count services by tenant (should only see your tenant)
SELECT
    t.name AS tenant_name,
    COUNT(s.id) AS service_count
FROM tenants t
LEFT JOIN services s ON s.tenant_id = t.id
GROUP BY t.id, t.name;
-- Expected: 1 row (your tenant with count = 16)

-- Test: Can only see own tenant's customers
SELECT id, name, tenant_id FROM customers;
-- Expected: Only customers for your tenant

-- Test: Can only see own tenant's VAT rates
SELECT id, name, rate, tenant_id FROM vat_rates;
-- Expected: 2 rows (15%, 0% for your tenant)

-- ============================================================================
-- TEST 3: Cross-Tenant Isolation (Manual Test)
-- ============================================================================

-- These queries should FAIL to return data from other tenants

-- Try to read Test Clinic's tenant (should be blocked)
SELECT * FROM tenants WHERE slug = 'test-clinic';
-- Expected: 0 rows (even though tenant exists)

-- Try to read Test Clinic's services (should be blocked)
SELECT * FROM services WHERE code = 'TEST-01';
-- Expected: 0 rows (RLS blocks cross-tenant access)

-- Try to join across tenants (should fail)
SELECT
    t.name AS tenant_name,
    s.code AS service_code,
    s.name AS service_name
FROM tenants t
CROSS JOIN services s
WHERE t.slug = 'test-clinic';
-- Expected: 0 rows (RLS prevents cross-tenant joins)

-- ============================================================================
-- TEST 4: Write Operations - Service Management
-- ============================================================================

-- Test: Create service (should succeed for any role)
INSERT INTO services (tenant_id, code, name, description, unit_price, is_active)
VALUES (
    get_user_tenant_id(),
    'TEST-CREATE',
    'Test Service Creation',
    'Testing write permissions',
    500.00,
    true
);
-- Expected: Success (staff can create services)

-- Test: Update own tenant's service (should succeed)
UPDATE services
SET unit_price = 550.00
WHERE code = 'TEST-CREATE';
-- Expected: Success (staff can update services)

-- Test: Delete service (should fail for staff, succeed for admin/owner)
DELETE FROM services WHERE code = 'TEST-CREATE';
-- Expected: Success if admin/owner, Denied if staff

-- Test: Try to create service for another tenant (should fail)
DO $$
DECLARE
    other_tenant_id UUID;
BEGIN
    SELECT id INTO other_tenant_id FROM tenants WHERE slug = 'test-clinic';

    INSERT INTO services (tenant_id, code, name, description, unit_price, is_active)
    VALUES (
        other_tenant_id,
        'HACK-01',
        'Hacked Service',
        'This should FAIL due to RLS',
        999.00,
        true
    );

    RAISE NOTICE 'ERROR: Cross-tenant insert succeeded (RLS failure!)';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'SUCCESS: Cross-tenant insert blocked by RLS';
    WHEN OTHERS THEN
        RAISE NOTICE 'SUCCESS: Cross-tenant insert blocked (%)';
END $$;
-- Expected: Exception (RLS blocks cross-tenant write)

-- ============================================================================
-- TEST 5: Invoice Operations - Draft vs Finalized
-- ============================================================================

-- Create test customer first
DO $$
DECLARE
    test_customer_id UUID;
BEGIN
    INSERT INTO customers (tenant_id, name, email, phone, is_active)
    VALUES (
        get_user_tenant_id(),
        'RLS Test Customer',
        'test@rls.com',
        '+27 82 000 0000',
        true
    )
    RETURNING id INTO test_customer_id;

    RAISE NOTICE 'Test customer created: %', test_customer_id;
END $$;

-- Test: Create Draft invoice (should succeed for all roles)
INSERT INTO invoices (tenant_id, customer_id, status, invoice_date, notes)
SELECT
    get_user_tenant_id(),
    id,
    'Draft',
    CURRENT_DATE,
    'RLS Test Invoice'
FROM customers
WHERE name = 'RLS Test Customer'
LIMIT 1
RETURNING id, invoice_number, status;
-- Expected: Success, invoice_number = NULL (Draft invoices don't have numbers)

-- Test: Read all invoices (should succeed)
SELECT id, invoice_number, status, customer_id, total_amount
FROM invoices
WHERE notes = 'RLS Test Invoice';
-- Expected: Shows your test invoice

-- Test: Update Draft invoice (should succeed for staff)
UPDATE invoices
SET notes = 'RLS Test Invoice - Updated'
WHERE notes = 'RLS Test Invoice';
-- Expected: Success (staff can edit Draft)

-- Test: Try to update Finalized invoice (should fail for staff, succeed for admin)
-- First, manually set status to Finalized
UPDATE invoices
SET status = 'Finalized', invoice_number = 'DEV-2025-9999'
WHERE notes = 'RLS Test Invoice - Updated';
-- Expected: Success (because it's our own invoice)

-- Now try to edit the finalized invoice
UPDATE invoices
SET notes = 'Trying to edit finalized'
WHERE invoice_number = 'DEV-2025-9999';
-- Expected: Denied if staff, Success if admin/owner

-- ============================================================================
-- TEST 6: Invoice Items - Draft Protection
-- ============================================================================

-- Get test invoice ID
DO $$
DECLARE
    test_invoice_id UUID;
    test_service_id UUID;
    test_vat_rate_id UUID;
BEGIN
    SELECT id INTO test_invoice_id FROM invoices WHERE notes LIKE 'RLS Test Invoice%';
    SELECT id INTO test_service_id FROM services WHERE code = 'CONS-01' LIMIT 1;
    SELECT id INTO test_vat_rate_id FROM vat_rates WHERE rate = 15.00 LIMIT 1;

    -- Test: Add item to Draft invoice (should succeed)
    INSERT INTO invoice_items (
        tenant_id, invoice_id, service_id, description,
        quantity, unit_price, vat_rate_id, vat_rate
    ) VALUES (
        get_user_tenant_id(),
        test_invoice_id,
        test_service_id,
        'Test Line Item',
        1.000,
        350.00,
        test_vat_rate_id,
        15.00
    );

    RAISE NOTICE 'Invoice item added successfully';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to add invoice item: %', SQLERRM;
END $$;

-- Verify totals were calculated
SELECT
    id,
    status,
    subtotal,
    total_vat,
    total_amount
FROM invoices
WHERE notes LIKE 'RLS Test Invoice%';
-- Expected: subtotal = 350.00, total_vat = 52.50, total_amount = 402.50

-- ============================================================================
-- TEST 7: Role-Based Access Control
-- ============================================================================

-- Test: Owner can update tenant
UPDATE tenants
SET phone = '+27 12 999 9999'
WHERE id = get_user_tenant_id();
-- Expected: Success if owner, Denied if admin/staff

-- Test: Owner can create users
-- (This would require an auth.users entry first)
-- Expected: Success if owner, Denied if admin/staff

-- Test: Admin can manage VAT rates
INSERT INTO vat_rates (tenant_id, name, rate, is_active)
VALUES (get_user_tenant_id(), 'Test Rate', 20.00, true)
RETURNING id, name, rate;
-- Expected: Success if admin/owner, Denied if staff

-- Test: Staff cannot delete customers
DELETE FROM customers WHERE name = 'RLS Test Customer';
-- Expected: Denied if staff, Success if admin/owner

-- ============================================================================
-- TEST 8: Audit Log
-- ============================================================================

-- Test: System can write audit log
INSERT INTO audit_log (
    tenant_id, action, entity_type, entity_id,
    old_values, new_values, performed_by
)
VALUES (
    get_user_tenant_id(),
    'create',
    'invoice',
    (SELECT id FROM invoices WHERE notes LIKE 'RLS Test Invoice%' LIMIT 1),
    NULL,
    '{"status": "Draft"}'::jsonb,
    auth.uid()
);
-- Expected: Success (all users can write audit logs)

-- Test: Cannot update audit log
UPDATE audit_log
SET notes = 'Trying to modify audit log'
WHERE entity_type = 'invoice';
-- Expected: Denied (audit logs are immutable)

-- Test: Cannot delete audit log
DELETE FROM audit_log WHERE entity_type = 'invoice';
-- Expected: Denied (audit logs are immutable)

-- View audit trail
SELECT
    action,
    entity_type,
    entity_id,
    performed_at,
    performed_by
FROM audit_log
ORDER BY performed_at DESC
LIMIT 10;
-- Expected: Shows your audit entries

-- ============================================================================
-- TEST 9: Cleanup Test Data
-- ============================================================================

-- Remove test data created during tests
DELETE FROM invoice_items WHERE description = 'Test Line Item';
DELETE FROM invoices WHERE notes LIKE 'RLS Test Invoice%';
DELETE FROM customers WHERE name = 'RLS Test Customer';
DELETE FROM services WHERE code IN ('TEST-CREATE', 'HACK-01');
DELETE FROM vat_rates WHERE name = 'Test Rate';

-- Optional: Remove test tenant (careful!)
-- DELETE FROM tenants WHERE slug = 'test-clinic';

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================

-- Run this to verify RLS is working correctly
DO $$
DECLARE
    tenant_count INTEGER;
    service_count INTEGER;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'RLS VERIFICATION SUMMARY';
    RAISE NOTICE '============================================================';

    -- Count visible tenants (should be 1)
    SELECT COUNT(*) INTO tenant_count FROM tenants;
    RAISE NOTICE 'Visible tenants: % (expected: 1)', tenant_count;

    -- Count visible services
    SELECT COUNT(*) INTO service_count FROM services;
    RAISE NOTICE 'Visible services: % (expected: 16)', service_count;

    -- Count active policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    RAISE NOTICE 'Active policies: % (expected: 30+)', policy_count;

    RAISE NOTICE '';
    RAISE NOTICE 'User context:';
    RAISE NOTICE '  User ID: %', auth.uid();
    RAISE NOTICE '  Tenant ID: %', get_user_tenant_id();
    RAISE NOTICE '  Role: %', get_user_role();

    RAISE NOTICE '';
    RAISE NOTICE 'RLS Status:';
    IF tenant_count = 1 AND service_count >= 16 AND policy_count >= 30 THEN
        RAISE NOTICE '  ✓ RLS is working correctly';
        RAISE NOTICE '  ✓ Tenant isolation enforced';
        RAISE NOTICE '  ✓ Policies active';
    ELSE
        RAISE NOTICE '  ✗ RLS may not be configured correctly';
        RAISE NOTICE '  ✗ Check policies and JWT claims';
    END IF;

    RAISE NOTICE '============================================================';
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================

/*

Expected Test Results:
======================

1. Tenant Isolation:
   ✓ Users see only their tenant's data
   ✓ Cross-tenant queries return 0 rows
   ✓ Cannot insert/update data for other tenants

2. Role-Based Access:
   ✓ Owner: Full access to tenant management
   ✓ Admin: Manage data, cannot manage users
   ✓ Staff: Create/edit drafts, read-only finalized

3. Invoice Workflow:
   ✓ Draft invoices: Editable by staff
   ✓ Finalized invoices: Read-only (except admins)
   ✓ Invoice items: Only editable when invoice is Draft

4. Audit Trail:
   ✓ All users can write audit logs
   ✓ Audit logs are immutable (cannot UPDATE or DELETE)

5. JWT Claims:
   ✓ tenant_id present in JWT
   ✓ user_role present in JWT
   ✓ Helper functions return correct values

Troubleshooting:
================

If tests fail:
1. Check JWT contains tenant_id: SELECT debug_jwt_claims();
2. Verify user_profile exists with correct tenant_id
3. Check RLS is enabled: SELECT * FROM pg_tables WHERE rowsecurity = true;
4. Verify policies exist: SELECT * FROM pg_policies WHERE schemaname = 'public';
5. Check custom JWT hook is configured in Supabase Dashboard

*/
