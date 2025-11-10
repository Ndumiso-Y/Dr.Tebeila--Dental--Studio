-- Migration: 006 - Auto-fill tenant_id for RLS compliance
-- Gate S6.2 - Functional Refinement
-- Purpose: Eliminate "new row violates row-level security policy" errors
-- Author: Embark Digitals | Claude Engineering
-- Date: 2025-11-10

-- ============================================================================
-- Function: Auto-fill tenant_id from authenticated user's profile
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set tenant_id if it's NULL
  IF NEW.tenant_id IS NULL THEN
    -- Fetch tenant_id from user_profiles using authenticated user's ID
    NEW.tenant_id := (
      SELECT tenant_id
      FROM public.user_profiles
      WHERE id = auth.uid()
      LIMIT 1
    );

    -- If still NULL, raise an error (user has no profile)
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Cannot determine tenant_id for user %', auth.uid();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.set_tenant_id() IS
'Auto-fills tenant_id from user_profiles to prevent RLS violations';

-- ============================================================================
-- Trigger: Apply tenant auto-fill to invoices table
-- ============================================================================

DROP TRIGGER IF EXISTS trg_set_tenant_id_invoices ON public.invoices;

CREATE TRIGGER trg_set_tenant_id_invoices
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

COMMENT ON TRIGGER trg_set_tenant_id_invoices ON public.invoices IS
'Automatically sets tenant_id on invoice creation';

-- ============================================================================
-- Trigger: Apply tenant auto-fill to customers table
-- ============================================================================

DROP TRIGGER IF EXISTS trg_set_tenant_id_customers ON public.customers;

CREATE TRIGGER trg_set_tenant_id_customers
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

COMMENT ON TRIGGER trg_set_tenant_id_customers ON public.customers IS
'Automatically sets tenant_id on customer/patient creation';

-- ============================================================================
-- Trigger: Apply tenant auto-fill to invoice_items table
-- ============================================================================

DROP TRIGGER IF EXISTS trg_set_tenant_id_invoice_items ON public.invoice_items;

CREATE TRIGGER trg_set_tenant_id_invoice_items
  BEFORE INSERT ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

COMMENT ON TRIGGER trg_set_tenant_id_invoice_items ON public.invoice_items IS
'Automatically sets tenant_id on invoice item creation';

-- ============================================================================
-- Index: Optimize patient search queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_customers_search
  ON public.customers (first_name, last_name, cell);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_search
  ON public.customers (tenant_id, first_name, last_name, cell);

COMMENT ON INDEX idx_customers_search IS
'Optimizes patient search by name and cell phone';

COMMENT ON INDEX idx_customers_tenant_search IS
'Optimizes tenant-filtered patient search';

-- ============================================================================
-- Extend invoice_status ENUM for Quotation workflow
-- ============================================================================

-- Check if 'Quotation' value already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'Quotation'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'invoice_status')
  ) THEN
    ALTER TYPE invoice_status ADD VALUE 'Quotation';
  END IF;
END$$;

COMMENT ON TYPE invoice_status IS
'Invoice lifecycle: Draft, Quotation, ProformaOffline, Finalized, Paid, Void';

-- ============================================================================
-- Verification Query (run after migration)
-- ============================================================================

-- Test 1: Verify triggers exist
-- SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE 'trg_set_tenant_id%';

-- Test 2: Verify indexes exist
-- SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_customers%';

-- Test 3: Verify Quotation status added
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'invoice_status');

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- DROP TRIGGER IF EXISTS trg_set_tenant_id_invoices ON public.invoices;
-- DROP TRIGGER IF EXISTS trg_set_tenant_id_customers ON public.customers;
-- DROP TRIGGER IF EXISTS trg_set_tenant_id_invoice_items ON public.invoice_items;
-- DROP FUNCTION IF EXISTS public.set_tenant_id();
-- DROP INDEX IF EXISTS idx_customers_search;
-- DROP INDEX IF EXISTS idx_customers_tenant_search;

-- Note: Cannot remove ENUM value without recreating the type
-- To remove 'Quotation': requires creating new type and migrating data
