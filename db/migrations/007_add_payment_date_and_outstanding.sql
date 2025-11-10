-- 007_add_payment_date_and_outstanding.sql
-- Adds payment_date column and improves outstanding tracking
-- Gate S8: Payment Clarity & Outstanding Logic
-- Date: 2025-11-11

-- Add payment_date column to track when payment was received
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;

COMMENT ON COLUMN public.invoices.payment_date IS 'Timestamp when payment was received (auto-set when status becomes Paid)';

-- Create monthly invoice summary view for reporting
CREATE OR REPLACE VIEW public.vw_invoice_summary AS
SELECT
    tenant_id,
    DATE_TRUNC('month', invoice_date) AS month,
    status,
    COUNT(*) AS invoice_count,
    SUM(total_amount) AS total_amount,
    SUM(amount_paid)  AS total_paid,
    SUM(total_amount - COALESCE(amount_paid, 0)) AS outstanding
FROM public.invoices
GROUP BY tenant_id, month, status
ORDER BY month DESC;

COMMENT ON VIEW public.vw_invoice_summary IS 'Monthly invoice summary per tenant for financial reporting';

-- Grant access to view for authenticated users
GRANT SELECT ON public.vw_invoice_summary TO authenticated;

-- Add index for faster payment_date queries
CREATE INDEX IF NOT EXISTS idx_invoices_payment_date
ON public.invoices (payment_date)
WHERE payment_date IS NOT NULL;

-- Add index for status-based reporting
CREATE INDEX IF NOT EXISTS idx_invoices_status_date
ON public.invoices (status, invoice_date);

COMMENT ON INDEX idx_invoices_payment_date IS 'Optimize queries filtering by payment date';
COMMENT ON INDEX idx_invoices_status_date IS 'Optimize status-based financial reports';
