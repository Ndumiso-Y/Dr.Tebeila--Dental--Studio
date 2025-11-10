#!/usr/bin/env python3
"""
Add post-payment action buttons to InvoiceDetail
Gate S6.2 - Functional Refinement
"""

import re

file_path = r"apps\web\src\pages\InvoiceDetail.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add duplicate and convert functions before the return statement
action_functions = r"""
  const handleDuplicateAsQuotation = async () => {
    if (!invoice) return;

    if (confirm('Create a quotation based on this invoice?')) {
      navigate(`/invoices/new?mode=quotation&duplicate=${invoice.id}`);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!invoice || invoice.status !== 'Quotation') return;

    if (confirm('Convert this quotation to an invoice?')) {
      try {
        const { error } = await supabase
          .from('invoices')
          .update({ status: 'Finalized' })
          .eq('id', invoice.id);

        if (error) throw error;

        alert('Quotation converted to invoice successfully!');
        fetchInvoice(); // Refresh data
      } catch (error: any) {
        console.error('[CONVERT_ERROR]', error);
        alert(`Failed to convert: ${error.message}`);
      }
    }
  };

  const handleSendWhatsApp = () => {
    if (!invoice) return;

    const message = encodeURIComponent(
      `Hi! Here is your ${invoice.status === 'Quotation' ? 'quotation' : 'invoice'} from Dr. Tebeila Dental Studio.\\n\\n` +
      `${invoice.status === 'Quotation' ? 'Quotation' : 'Invoice'} #: ${invoice.invoice_number}\\n` +
      `Date: ${formatDateDisplay(invoice.invoice_date)}\\n` +
      `Total: ${formatCurrency(invoice.total_amount)}\\n\\n` +
      `Thank you for choosing us!`
    );

    const phone = invoice.customer.cell?.replace(/\s/g, '') || '';
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    } else {
      alert('No cell phone number available for this patient.');
    }
  };

"""

content = re.sub(
    r"(  if \(authLoading \|\| loading\) \{)",
    action_functions + r"\1",
    content
)

# 2. Add action buttons section after payment information card (before closing </Layout>)
action_buttons = r"""
      {/* Post-Action Buttons (Gate S6.2) */}
      <div className="card mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Print PDF */}
          <button
            onClick={handlePrint}
            className="btn btn-primary flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPDF}
            className="btn btn-secondary flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>

          {/* Duplicate as Quotation */}
          {invoice.status !== 'Quotation' && (
            <button
              onClick={handleDuplicateAsQuotation}
              className="btn btn-outline flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Duplicate as Quotation
            </button>
          )}

          {/* Convert to Invoice (for quotations only) */}
          {invoice.status === 'Quotation' && (
            <button
              onClick={handleConvertToInvoice}
              className="btn btn-primary flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Convert to Invoice
            </button>
          )}

          {/* Send via WhatsApp */}
          <button
            onClick={handleSendWhatsApp}
            className="btn btn-outline flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Send via WhatsApp
          </button>

          {/* View All Invoices */}
          <button
            onClick={() => navigate('/invoices')}
            className="btn btn-outline flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View All {invoice.status === 'Quotation' ? 'Quotations' : 'Invoices'}
          </button>
        </div>
      </div>
"""

content = re.sub(
    r"(    </Layout>\n  \);\n\})",
    action_buttons + r"\n\1",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Post-payment action buttons added to InvoiceDetail")
