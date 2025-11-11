-- vw_payment_timeline.sql
-- Daily payment trend view for reports dashboard
-- Gate S9: Reports & Automation Suite
-- Date: 2025-11-11

-- Create daily payment timeline view
CREATE OR REPLACE VIEW public.vw_payment_timeline AS
SELECT
  tenant_id,
  invoice_date::date AS day,
  COUNT(*) AS invoice_count,
  SUM(total_amount) AS billed,
  SUM(COALESCE(amount_paid, 0)) AS paid,
  SUM(total_amount - COALESCE(amount_paid, 0)) AS outstanding
FROM public.invoices
WHERE invoice_date IS NOT NULL
GROUP BY tenant_id, invoice_date::date
ORDER BY tenant_id, day DESC;

COMMENT ON VIEW public.vw_payment_timeline IS 'Daily payment trends per tenant for reports dashboard';

-- Grant access to authenticated users
GRANT SELECT ON public.vw_payment_timeline TO authenticated;

-- Add performance index for invoice_date queries
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date
ON public.invoices (tenant_id, invoice_date)
WHERE invoice_date IS NOT NULL;

COMMENT ON INDEX idx_invoices_invoice_date IS 'Optimize reports queries filtering by invoice date and tenant';

-- Add index for status-based filtering in reports
CREATE INDEX IF NOT EXISTS idx_invoices_status_tenant
ON public.invoices (tenant_id, status);

COMMENT ON INDEX idx_invoices_status_tenant IS 'Optimize reports queries filtering by status per tenant';
