-- Gate S5: Patient & Payment Management Enhancement
-- Migration: Add patient contact fields and payment tracking
-- Date: 2025-11-10

-- ============================================================================
-- 1. EXTEND CUSTOMERS TABLE (Patient Data)
-- ============================================================================

-- Add new patient fields
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS cell TEXT;

-- Migrate existing 'name' to first_name/last_name
-- (Manual cleanup may be needed for existing data)
UPDATE customers
SET
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = NULLIF(SUBSTRING(name FROM POSITION(' ' IN name) + 1), '')
WHERE first_name IS NULL AND name IS NOT NULL;

-- Update notes column comment
COMMENT ON COLUMN customers.notes IS 'Patient notes: allergies, treatment remarks, medical history';

-- ============================================================================
-- 2. EXTEND INVOICES TABLE (Payment Tracking)
-- ============================================================================

-- Add payment tracking fields
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash',
  ADD COLUMN IF NOT EXISTS change_due NUMERIC(10,2) DEFAULT 0.00;

-- Add check constraint for payment method
ALTER TABLE invoices
  ADD CONSTRAINT chk_payment_method
  CHECK (payment_method IN ('Cash', 'Card', 'EFT', 'Medical Aid', 'Split'));

-- Add comment
COMMENT ON COLUMN invoices.amount_paid IS 'Amount tendered by patient at time of payment';
COMMENT ON COLUMN invoices.payment_method IS 'Payment method: Cash, Card, EFT, Medical Aid, or Split';
COMMENT ON COLUMN invoices.change_due IS 'Change to return to patient (amount_paid - total_amount)';

-- ============================================================================
-- 3. CREATE TRIGGER FOR AUTO-CALCULATING CHANGE
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_change_due()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate change for Cash payments
  IF NEW.payment_method = 'Cash' AND NEW.amount_paid IS NOT NULL THEN
    NEW.change_due = GREATEST(NEW.amount_paid - NEW.total_amount, 0.00);
  ELSE
    NEW.change_due = 0.00;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_invoice_change
BEFORE INSERT OR UPDATE OF amount_paid, payment_method, total_amount ON invoices
FOR EACH ROW
EXECUTE FUNCTION calculate_change_due();

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_customers_first_name ON customers(tenant_id, first_name);
CREATE INDEX IF NOT EXISTS idx_customers_last_name ON customers(tenant_id, last_name);
CREATE INDEX IF NOT EXISTS idx_customers_cell ON customers(tenant_id, cell);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_method ON invoices(tenant_id, payment_method);

-- ============================================================================
-- 5. UPDATE RLS POLICIES (IF NEEDED)
-- ============================================================================

-- RLS policies inherit tenant_id filtering, so new columns are automatically secured
-- No additional RLS policies needed

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verification Queries:
-- SELECT first_name, last_name, cell, email FROM customers LIMIT 5;
-- SELECT invoice_number, amount_paid, payment_method, change_due FROM invoices LIMIT 5;
