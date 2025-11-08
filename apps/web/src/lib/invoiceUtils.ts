import { supabase } from './supabase';

/**
 * Generates a unique invoice number in the format: INV-YYYYMMDD-###
 * where ### is a sequential number for that day
 *
 * @param tenantId - The tenant ID to scope the invoice numbering
 * @returns Promise<string> - The generated invoice number
 */
export async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = `INV-${year}${month}${day}`;

  console.log('[INVOICE_NUMBER_GEN] Generating for date:', datePrefix);

  try {
    // Find all invoices for this tenant with today's date prefix
    const { data: existingInvoices, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('tenant_id', tenantId)
      .like('invoice_number', `${datePrefix}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[INVOICE_NUMBER_ERROR] Error querying existing invoices:', error);
      throw error;
    }

    let sequenceNumber = 1;

    if (existingInvoices && existingInvoices.length > 0) {
      // Extract the sequence number from the last invoice
      const lastInvoiceNumber = existingInvoices[0].invoice_number;
      if (lastInvoiceNumber) {
        const parts = lastInvoiceNumber.split('-');
        if (parts.length === 3) {
          sequenceNumber = parseInt(parts[2], 10) + 1;
        }
      }
    }

    const invoiceNumber = `${datePrefix}-${String(sequenceNumber).padStart(3, '0')}`;
    console.log('[INVOICE_NUMBER_GENERATED]', invoiceNumber);

    return invoiceNumber;
  } catch (error) {
    console.error('[INVOICE_NUMBER_ERROR] Failed to generate invoice number:', error);
    throw error;
  }
}

/**
 * Format currency in South African Rands
 */
export function formatCurrency(amount: number): string {
  return `R ${amount.toFixed(2)}`;
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date to display format (DD MMM YYYY)
 */
export function formatDateDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  };
  return d.toLocaleDateString('en-ZA', options);
}
