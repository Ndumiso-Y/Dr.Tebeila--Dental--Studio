-- ============================================================================
-- Gate S3: Add unique constraint to invoice_number
-- Ensures invoice numbers are unique per tenant
-- ============================================================================

-- Add unique constraint to invoice_number scoped by tenant_id
ALTER TABLE invoices
ADD CONSTRAINT invoices_tenant_invoice_number_key
UNIQUE (tenant_id, invoice_number);

-- Verify constraint was added
SELECT conname, contype
FROM pg_constraint
WHERE conname = 'invoices_tenant_invoice_number_key';

-- ============================================================================
-- Instructions:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. This ensures invoice numbers like "INV-20251108-001" are unique per tenant
-- 3. Any duplicate invoice_number attempts will fail with a unique violation error
-- ============================================================================
