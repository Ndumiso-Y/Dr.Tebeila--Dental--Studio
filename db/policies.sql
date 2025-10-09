-- Dr.Tebeila Dental Studio - Row Level Security Policies (SaaS Multi-tenant)
-- PostgreSQL (Supabase)
-- Version: 2.0 - Multi-tenant RLS
-- Date: 2025-10-09

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vat_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current user's tenant_id from JWT
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT tenant_id
        FROM user_profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role
        FROM user_profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is owner
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is admin or owner
CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('owner', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user belongs to tenant
CREATE OR REPLACE FUNCTION user_belongs_to_tenant(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_tenant_id() = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- TENANTS POLICIES
-- ============================================================================

-- Users can read their own tenant
CREATE POLICY "Users can read own tenant"
ON tenants FOR SELECT
USING (id = get_user_tenant_id());

-- Owners can update their tenant
CREATE POLICY "Owners can update own tenant"
ON tenants FOR UPDATE
USING (id = get_user_tenant_id() AND is_owner())
WITH CHECK (id = get_user_tenant_id() AND is_owner());

-- Note: Tenant creation handled via signup flow (no INSERT policy needed)

-- ============================================================================
-- USER PROFILES POLICIES
-- ============================================================================

-- Users can read profiles in their tenant
CREATE POLICY "Users can read tenant profiles"
ON user_profiles FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- Users can update their own profile (except role and tenant_id)
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() AND
    tenant_id = get_user_tenant_id() AND
    role = (SELECT role FROM user_profiles WHERE id = auth.uid())
);

-- Owners can insert new users in their tenant
CREATE POLICY "Owners can create tenant users"
ON user_profiles FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id() AND is_owner());

-- Owners can update tenant users (including role changes)
CREATE POLICY "Owners can update tenant users"
ON user_profiles FOR UPDATE
USING (tenant_id = get_user_tenant_id() AND is_owner())
WITH CHECK (tenant_id = get_user_tenant_id() AND is_owner());

-- Owners can delete tenant users (except themselves)
CREATE POLICY "Owners can delete tenant users"
ON user_profiles FOR DELETE
USING (tenant_id = get_user_tenant_id() AND is_owner() AND id != auth.uid());

-- ============================================================================
-- VAT RATES POLICIES
-- ============================================================================

-- Users can read VAT rates in their tenant
CREATE POLICY "Users can read tenant vat rates"
ON vat_rates FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- Admins can manage VAT rates
CREATE POLICY "Admins can manage vat rates"
ON vat_rates FOR ALL
USING (tenant_id = get_user_tenant_id() AND is_admin_or_owner())
WITH CHECK (tenant_id = get_user_tenant_id() AND is_admin_or_owner());

-- ============================================================================
-- UNITS POLICIES
-- ============================================================================

-- Users can read units in their tenant
CREATE POLICY "Users can read tenant units"
ON units FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- Admins can manage units
CREATE POLICY "Admins can manage units"
ON units FOR ALL
USING (tenant_id = get_user_tenant_id() AND is_admin_or_owner())
WITH CHECK (tenant_id = get_user_tenant_id() AND is_admin_or_owner());

-- ============================================================================
-- SERVICES POLICIES
-- ============================================================================

-- Users can read services in their tenant
CREATE POLICY "Users can read tenant services"
ON services FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- Staff can create services
CREATE POLICY "Staff can create services"
ON services FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

-- Staff can update services
CREATE POLICY "Staff can update services"
ON services FOR UPDATE
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

-- Admins can delete services
CREATE POLICY "Admins can delete services"
ON services FOR DELETE
USING (tenant_id = get_user_tenant_id() AND is_admin_or_owner());

-- ============================================================================
-- CUSTOMERS POLICIES
-- ============================================================================

-- Users can read customers in their tenant
CREATE POLICY "Users can read tenant customers"
ON customers FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- Staff can create customers
CREATE POLICY "Staff can create customers"
ON customers FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

-- Staff can update customers
CREATE POLICY "Staff can update customers"
ON customers FOR UPDATE
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

-- Admins can delete customers
CREATE POLICY "Admins can delete customers"
ON customers FOR DELETE
USING (tenant_id = get_user_tenant_id() AND is_admin_or_owner());

-- ============================================================================
-- INVOICE COUNTERS POLICIES
-- ============================================================================

-- Users can read counters in their tenant
CREATE POLICY "Users can read tenant counters"
ON invoice_counters FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- System can insert/update counters (via trigger/function)
CREATE POLICY "System can manage counters"
ON invoice_counters FOR ALL
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

-- ============================================================================
-- INVOICES POLICIES
-- ============================================================================

-- Users can read invoices in their tenant
CREATE POLICY "Users can read tenant invoices"
ON invoices FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- Staff can create invoices
CREATE POLICY "Staff can create invoices"
ON invoices FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

-- Staff can update Draft invoices
-- Admins can update any invoice (for corrections)
CREATE POLICY "Staff can update draft invoices"
ON invoices FOR UPDATE
USING (
    tenant_id = get_user_tenant_id() AND
    (status = 'Draft' OR is_admin_or_owner())
)
WITH CHECK (
    tenant_id = get_user_tenant_id() AND
    (status = 'Draft' OR is_admin_or_owner())
);

-- Admins can delete invoices (Draft only for safety)
CREATE POLICY "Admins can delete draft invoices"
ON invoices FOR DELETE
USING (
    tenant_id = get_user_tenant_id() AND
    is_admin_or_owner() AND
    status = 'Draft'
);

-- ============================================================================
-- INVOICE ITEMS POLICIES
-- ============================================================================

-- Users can read invoice items in their tenant
CREATE POLICY "Users can read tenant invoice items"
ON invoice_items FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- Staff can create invoice items (for Draft invoices)
CREATE POLICY "Staff can create invoice items"
ON invoice_items FOR INSERT
WITH CHECK (
    tenant_id = get_user_tenant_id() AND
    EXISTS (
        SELECT 1 FROM invoices
        WHERE id = invoice_items.invoice_id
        AND status = 'Draft'
        AND tenant_id = get_user_tenant_id()
    )
);

-- Staff can update invoice items (for Draft invoices)
CREATE POLICY "Staff can update invoice items"
ON invoice_items FOR UPDATE
USING (
    tenant_id = get_user_tenant_id() AND
    EXISTS (
        SELECT 1 FROM invoices
        WHERE id = invoice_items.invoice_id
        AND status = 'Draft'
        AND tenant_id = get_user_tenant_id()
    )
)
WITH CHECK (
    tenant_id = get_user_tenant_id() AND
    EXISTS (
        SELECT 1 FROM invoices
        WHERE id = invoice_items.invoice_id
        AND status = 'Draft'
        AND tenant_id = get_user_tenant_id()
    )
);

-- Staff can delete invoice items (for Draft invoices)
CREATE POLICY "Staff can delete invoice items"
ON invoice_items FOR DELETE
USING (
    tenant_id = get_user_tenant_id() AND
    EXISTS (
        SELECT 1 FROM invoices
        WHERE id = invoice_items.invoice_id
        AND status = 'Draft'
        AND tenant_id = get_user_tenant_id()
    )
);

-- ============================================================================
-- AUDIT LOG POLICIES
-- ============================================================================

-- Users can read audit logs in their tenant
CREATE POLICY "Users can read tenant audit logs"
ON audit_log FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- System can insert audit logs
CREATE POLICY "System can create audit logs"
ON audit_log FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

-- No UPDATE or DELETE on audit logs (immutable)

-- ============================================================================
-- STORAGE POLICIES (Supabase Storage - to be configured in Dashboard)
-- ============================================================================

-- Bucket: invoice-attachments
-- Policy: Users can upload to their tenant folder
-- INSERT: bucket_id = 'invoice-attachments' AND (storage.foldername(name))[1] = get_user_tenant_id()::text

-- Policy: Users can read from their tenant folder
-- SELECT: bucket_id = 'invoice-attachments' AND (storage.foldername(name))[1] = get_user_tenant_id()::text

-- Policy: Admins can delete from their tenant folder
-- DELETE: bucket_id = 'invoice-attachments' AND (storage.foldername(name))[1] = get_user_tenant_id()::text AND is_admin_or_owner()

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can read own tenant" ON tenants IS 'Tenant isolation: users can only see their own tenant';
COMMENT ON POLICY "Users can read tenant profiles" ON user_profiles IS 'Users can view other users in their tenant';
COMMENT ON POLICY "Users can read tenant invoices" ON invoices IS 'Tenant isolation: users can only access invoices in their tenant';
COMMENT ON POLICY "Staff can update draft invoices" ON invoices IS 'Draft invoices editable by staff, all invoices editable by admins';
COMMENT ON POLICY "Staff can create invoice items" ON invoice_items IS 'Items can only be added to Draft invoices';
COMMENT ON POLICY "System can create audit logs" ON audit_log IS 'Audit logs are append-only for compliance';

-- ============================================================================
-- NOTES
-- ============================================================================

-- RLS Enforcement Strategy:
-- 1. EVERY table has tenant_id (except tenants itself)
-- 2. ALL policies filter by: tenant_id = get_user_tenant_id()
-- 3. JWT must contain tenant_id claim (set during login)
-- 4. Users cannot access data from other tenants
-- 5. Role hierarchy: owner > admin > staff
-- 6. Owners can manage users, admins can manage data, staff can create/edit

-- Invoice Workflow & Permissions:
-- - Draft: Full edit by staff
-- - ProformaOffline/Finalized/Paid: Read-only (except admins for corrections)
-- - Void: Read-only, cannot be un-voided
-- - Invoice items: Only editable when invoice is Draft

-- Audit Trail:
-- - All finalize/mark_paid/void operations logged
-- - Audit logs are immutable (no UPDATE/DELETE policies)
-- - Track user, timestamp, old/new values
