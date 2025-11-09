import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase, InvoiceWithDetails } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { formatCurrency, formatDateDisplay } from '../lib/invoiceUtils';
import { generateInvoicePDF } from '../lib/pdfGenerator';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenantId, loading: authLoading } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId && id) {
      fetchInvoice();
    }
  }, [id, tenantId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      console.log('[INVOICE_DETAIL_FETCH]', id);

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          invoice_items(*)
        `)
        .eq('id', id!)
        .eq('tenant_id', tenantId!)
        .single();

      if (error) throw error;

      if (!data) {
        setError('Invoice not found');
        return;
      }

      // Sort invoice items by line_order
      data.invoice_items.sort((a, b) => a.line_order - b.line_order);

      setInvoice(data as InvoiceWithDetails);
      console.log('[INVOICE_DETAIL_LOADED]', data.invoice_number);
    } catch (err: any) {
      console.error('[INVOICE_DETAIL_ERROR]', err);
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!invoice) return;

    try {
      generateInvoicePDF(invoice);
    } catch (error: any) {
      console.error('[PDF_ERROR]', error);
      alert(`Failed to generate PDF: ${error.message}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="p-6 text-center">Loading invoice...</div>
      </Layout>
    );
  }

  if (error || !invoice) {
    return (
      <Layout>
        <div className="card">
          <div className="text-center text-red-600 py-8">
            <p className="text-lg font-semibold">Error</p>
            <p className="mt-2">{error || 'Invoice not found'}</p>
            <button
              onClick={() => navigate('/invoices')}
              className="btn btn-primary mt-4"
            >
              Back to Invoices
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header with Action Buttons */}
      <div className="card bg-gradient-to-r from-primary-50 to-secondary-50 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {invoice.invoice_number || 'Draft Invoice'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Status: <span className="font-semibold">{invoice.status}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/invoices')}
              className="btn btn-outline"
            >
              Back
            </button>
            <button onClick={handlePrint} className="btn btn-primary">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print
            </button>
            <button onClick={handleDownloadPDF} className="btn btn-secondary">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Patient Information */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Patient Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="font-medium">{invoice.customer.name}</p>
          </div>
          {invoice.customer.email && (
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{invoice.customer.email}</p>
            </div>
          )}
          {invoice.customer.phone && (
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{invoice.customer.phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Details */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Invoice Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Invoice Number</p>
            <p className="font-medium">{invoice.invoice_number || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Invoice Date</p>
            <p className="font-medium">{formatDateDisplay(invoice.invoice_date)}</p>
          </div>
          {invoice.due_date && (
            <div>
              <p className="text-sm text-gray-600">Due Date</p>
              <p className="font-medium">{formatDateDisplay(invoice.due_date)}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-medium">{invoice.status}</p>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Notes</p>
            <p className="text-gray-900">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Procedures & Services</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  VAT %
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.invoice_items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {item.vat_rate}%
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(item.line_total_incl_vat)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="card bg-gray-50">
        <div className="flex justify-end">
          <div className="w-full md:w-1/2 lg:w-1/3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal (Excl. VAT):</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT (15%):</span>
              <span className="font-medium text-secondary">
                {formatCurrency(invoice.total_vat)}
              </span>
            </div>
            <div className="border-t-2 border-gray-300 pt-2 flex justify-between">
              <span className="text-lg font-bold text-gray-900">Total Amount:</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(invoice.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
