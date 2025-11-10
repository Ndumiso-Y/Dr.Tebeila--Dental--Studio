import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, Customer, Service, VATRate } from '../lib/supabase';
import { safeQuery } from '../lib/safeQuery';
import Layout from '../components/Layout';
import { calculateLineTotals } from '../lib/db';
import PatientModal from '../components/PatientModal';
import CreatablePatientSelect from '../components/CreatablePatientSelect';
import { generateInvoiceNumber } from '../lib/invoiceUtils';

interface LineItem {
  id: string;
  service_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  vat_rate_id: string;
}

export default function InvoiceNew() {
  const navigate = useNavigate();
  const { tenantId, loading: authLoading, error: authError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  // Form state
  const [patientId, setPatientId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Payment tracking state (Gate S5)
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [changeDue, setChangeDue] = useState<number>(0);

  // Patient modal state
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);

  // Quotation mode (Gate S6.2)
  const [searchParams] = useSearchParams();
  const isQuotationMode = searchParams.get('mode') === 'quotation';


  const [vatRates, setVATRates] = useState<VATRate[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);


  const fetchData = async () => {
    try {
      if (!tenantId) return; // wait until we know the user's tenant

      // Use safeQuery with timeout and retry for all dropdown data
      const [customersRes, servicesRes, vatRatesRes] = await Promise.all([
        safeQuery(
          () => supabase.from('customers').select('*')
            .eq('tenant_id', tenantId).eq('is_active', true).order('name'),
          { timeoutMs: 7000, retries: 2 }
        ),
        safeQuery(
          () => supabase.from('services').select('*')
            .eq('tenant_id', tenantId).eq('is_active', true).order('name'),
          { timeoutMs: 7000, retries: 2 }
        ),
        safeQuery(
          () => supabase.from('vat_rates').select('*')
            .eq('tenant_id', tenantId).eq('is_active', true).order('rate'),
          { timeoutMs: 7000, retries: 2 }
        ),
      ]);

      if (customersRes.error) {
        console.error('Error fetching patients:', customersRes.error);
      } else if (customersRes.data) {
        setPatients(customersRes.data);
      }

      if (servicesRes.error) {
        console.error('Error fetching services:', servicesRes.error);
      } else if (servicesRes.data) {
        setServices(servicesRes.data);
      }

      if (vatRatesRes.error) {
        console.error('Error fetching VAT rates:', vatRatesRes.error);
      } else if (vatRatesRes.data) {
        setVATRates(vatRatesRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  // Auto-calculate change due for Cash payments (Gate S5)
  useEffect(() => {
    const totals = calculateTotals();
    if (paymentMethod === 'Cash' && amountPaid > 0) {
      setChangeDue(Math.max(amountPaid - totals.total, 0));
    } else {
      setChangeDue(0);
    }
  }, [amountPaid, paymentMethod, lineItems]);


  if (authLoading) {
    return (
      <Layout>
        <div className="p-6 text-center">Loading account…</div>
      </Layout>
    );
  }
  if (authError) {
    return (
      <Layout>
        <div className="p-6 text-center text-red-600">Error: {authError}</div>
      </Layout>
    );
  }
  if (!tenantId) {
    return (
      <Layout>
        <div className="p-6 text-center">No tenant linked to this user.</div>
      </Layout>
    );
  }

  const addLineItem = () => {
    const defaultVATRate = vatRates.find((v) => v.is_default) || vatRates[0];
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        service_id: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        vat_rate: defaultVATRate?.rate || 15,
        vat_rate_id: defaultVATRate?.id || '',
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // If service selected, populate description and price
          if (field === 'service_id' && value) {
            const service = services.find((s) => s.id === value);
            if (service) {
              updated.description = service.name;
              updated.unit_price = service.unit_price;
              if (service.vat_rate_id) {
                const vatRate = vatRates.find((v) => v.id === service.vat_rate_id);
                if (vatRate) {
                  updated.vat_rate = vatRate.rate;
                  updated.vat_rate_id = vatRate.id;
                }
              }
            }
          }

          return updated;
        }
        return item;
      })
    );
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalVAT = 0;

    lineItems.forEach((item) => {
      const { line_total, vat_amount } = calculateLineTotals(
        item.quantity,
        item.unit_price,
        item.vat_rate
      );
      subtotal += line_total;
      totalVAT += vat_amount;
    });

    return {
      subtotal,
      totalVAT,
      total: subtotal + totalVAT,
    };
  };

  const handlePatientCreated = async (patientId: string) => {
    // Refresh patient list after creation
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId!)
      .eq('is_active', true)
      .order('name');

    if (data) {
      setPatients(data);
      setPatientId(patientId);
    }

    setIsPatientModalOpen(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!patientId) {
      alert('Please select a patient');
      return;
    }

    if (lineItems.length === 0) {
      alert('Please add at least one line item');
      return;
    }

    setLoading(true);

    try {
      const { subtotal, totalVAT, total } = calculateTotals();

      // Generate unique invoice number
      const invoiceNumber = await generateInvoiceNumber(tenantId!);

      // Auto-status logic (Gate S8): Determine status based on payment
      let invoiceStatus = isQuotationMode ? 'Quotation' : 'Draft';
      let paymentDate = null;

      if (amountPaid >= total && amountPaid > 0) {
        invoiceStatus = 'Paid';
        paymentDate = new Date().toISOString();
      }

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          customer_id: patientId,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          status: invoiceStatus,
          subtotal,
          total_vat: totalVAT,
          total_amount: total,
          paid_amount: 0,
          notes,
        // Payment tracking fields (Gate S5)
        amount_paid: amountPaid,
        payment_method: paymentMethod,
        change_due: changeDue,
        payment_date: paymentDate,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;
      console.log('[INVOICE_CREATED]', invoiceNumber, invoice.id);

      // Create line items
      const items = lineItems.map((item, index) => {
        const { line_total, vat_amount, line_total_incl_vat } = calculateLineTotals(
          item.quantity,
          item.unit_price,
          item.vat_rate
        );

        return {
          invoice_id: invoice.id,
          line_order: index,
          service_id: item.service_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate_id: item.vat_rate_id,
          vat_rate: item.vat_rate,
          vat_amount,
          line_total,
          line_total_incl_vat,
        };
      });

      const { error: itemsError } = await supabase.from('invoice_items').insert(items);

      if (itemsError) throw itemsError;

      alert('Invoice created successfully!');
      navigate('/invoices');
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Layout>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Header with Logo */}
        <div className="card bg-gradient-to-r from-primary-50 to-secondary-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Logo */}
              <div className="w-20 h-20 rounded-lg bg-white flex items-center justify-center shadow-lg overflow-hidden">
                <img
                  src={`${import.meta.env.BASE_URL}logo.png`}
                  alt="Dr.Tebeila Dental Studio"
                  className="w-full h-full object-contain p-2"
                />
              </div>

              {/* Business Info */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dr.Tebeila Dental Studio</h1>
                <p className="text-sm text-gray-600">New Invoice</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-x-2">
              <button
                type="button"
                onClick={() => navigate('/invoices')}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Saving...' : (isQuotationMode ? 'Save Quotation' : 'Save Draft')}
              </button>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Invoice Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="patient" className="label">
                Patient *
              </label>
              <div className="flex gap-2">
                <select
                  id="patient"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="input flex-1"
                  required
                >
                  <option value="">Select a patient...</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                      {patient.cell ? ` - ${patient.cell}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsPatientModalOpen(true)}
                  className="btn btn-primary whitespace-nowrap"
                  title="Add New Patient"
                >
                  + New Patient
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="invoiceDate" className="label">
                Invoice Date *
              </label>
              <input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label htmlFor="dueDate" className="label">
                Due Date
              </label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="label">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={3}
              placeholder="Add any notes or special instructions..."
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="card space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Line Items</h2>
            <button
              type="button"
              onClick={addLineItem}
              className="btn btn-outline text-sm"
            >
              + Add Line
            </button>
          </div>

          {lineItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No line items yet</p>
              <p className="text-xs text-gray-400">Click "Add Line" to add procedures to this invoice</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table Header */}
              <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2 bg-gray-50 rounded-md text-xs font-semibold text-gray-700 uppercase">
                <div className="col-span-4">Procedure / Service</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-1 text-center">Qty</div>
                <div className="col-span-1 text-right">Price</div>
                <div className="col-span-1 text-right">VAT %</div>
                <div className="col-span-1 text-right">Subtotal</div>
                <div className="col-span-1"></div>
              </div>

              {/* Line Items */}
              {lineItems.map((item, index) => {
                const itemTotals = calculateLineTotals(item.quantity, item.unit_price, item.vat_rate);
                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors bg-white shadow-sm">
                    <div className="grid grid-cols-12 gap-3 items-start">
                      {/* Service Dropdown */}
                      <div className="col-span-12 lg:col-span-4">
                        <label className="label text-xs lg:hidden">Procedure / Service</label>
                        <select
                          value={item.service_id}
                          onChange={(e) =>
                            updateLineItem(item.id, 'service_id', e.target.value)
                          }
                          className="input text-sm"
                        >
                          <option value="">Select procedure...</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.code} - {service.name} (R{service.unit_price.toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div className="col-span-12 lg:col-span-3">
                        <label className="label text-xs lg:hidden">Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(item.id, 'description', e.target.value)
                          }
                          className="input text-sm"
                          placeholder="Additional details..."
                        />
                      </div>

                      {/* Quantity */}
                      <div className="col-span-4 lg:col-span-1">
                        <label className="label text-xs lg:hidden">Quantity</label>
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          className="input text-sm text-center"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-4 lg:col-span-1">
                        <label className="label text-xs lg:hidden">Price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)
                          }
                          className="input text-sm text-right"
                        />
                      </div>

                      {/* VAT Rate */}
                      <div className="col-span-4 lg:col-span-1">
                        <label className="label text-xs lg:hidden">VAT %</label>
                        <select
                          value={item.vat_rate_id}
                          onChange={(e) => {
                            const vatRate = vatRates.find(v => v.id === e.target.value);
                            if (vatRate) {
                              updateLineItem(item.id, 'vat_rate_id', vatRate.id);
                              updateLineItem(item.id, 'vat_rate', vatRate.rate);
                            }
                          }}
                          className="input text-sm text-right"
                        >
                          {vatRates.map((vat) => (
                            <option key={vat.id} value={vat.id}>
                              {vat.rate}%
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Line Subtotal (calculated) */}
                      <div className="col-span-10 lg:col-span-1">
                        <label className="label text-xs lg:hidden">Subtotal</label>
                        <div className="text-sm font-semibold text-gray-900 lg:text-right py-2">
                          R{itemTotals.line_total.toFixed(2)}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <div className="col-span-2 lg:col-span-1 flex items-end justify-end">
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-md transition-colors"
                          title="Remove item"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Tax breakdown for this line (mobile/detailed view) */}
                    <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 flex justify-end space-x-4">
                      <span>Excl. VAT: R{itemTotals.line_total.toFixed(2)}</span>
                      <span>VAT ({item.vat_rate}%): R{itemTotals.vat_amount.toFixed(2)}</span>
                      <span className="font-semibold text-gray-900">Incl. VAT: R{itemTotals.line_total_incl_vat.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invoice Totals Summary */}
        {lineItems.length > 0 && (
          <div className="card bg-gray-50">
            <div className="flex justify-between items-start">
              {/* Tax Information */}
              <div className="text-sm text-gray-600 max-w-md">
                <p className="font-semibold text-gray-900 mb-2">Tax Information</p>
                <p className="text-xs">All prices include VAT at the applicable rate.</p>
                <p className="text-xs mt-1">Standard VAT Rate: 15%</p>
                <p className="text-xs text-gray-500 mt-2">
                  VAT No: 4123456789
                </p>
              </div>

              {/* Totals Breakdown */}
              <div className="min-w-[320px] bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Invoice Summary</h3>

                <div className="space-y-2">
                  {/* Subtotal (Excluding VAT) */}
                  <div className="flex justify-between text-sm py-1">
                    <span className="text-gray-600">Subtotal (Excl. VAT):</span>
                    <span className="font-mono font-medium">R {totals.subtotal.toFixed(2)}</span>
                  </div>

                  {/* VAT Breakdown by Rate */}
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">VAT (15%):</span>
                      <span className="font-mono font-medium text-secondary">R {totals.totalVAT.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="border-t-2 border-gray-300 pt-3 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total Amount:</span>
                      <span className="text-2xl font-bold text-primary font-mono">R {totals.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Amount in Words (placeholder) */}
                  <div className="text-xs text-gray-500 italic pt-2 border-t border-gray-100">
                    Amount Due: R {totals.total.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Details Section (Gate S5) */}
        {lineItems.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💳 Payment Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount Paid */}
              <div>
                <label htmlFor="amount_paid" className="label">
                  Amount Paid (R)
                </label>
                <input
                  type="number"
                  id="amount_paid"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className="input"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the amount tendered by the patient
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <label htmlFor="payment_method" className="label">
                  Payment Method
                </label>
                <select
                  id="payment_method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input"
                >
                  <option value="Cash">💵 Cash</option>
                  <option value="Card">💳 Card</option>
                  <option value="EFT">🏦 EFT</option>
                  <option value="Medical Aid">🏥 Medical Aid</option>
                  <option value="Split">📊 Split Payment</option>
                </select>
              </div>
            </div>

            {/* Change Due (Auto-calculated for Cash) */}
            {paymentMethod === 'Cash' && amountPaid > 0 && (
              <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Change to Return:</span>
                  <span className="text-3xl font-bold text-primary font-mono">
                    R {changeDue.toFixed(2)}
                  </span>
                </div>
                {changeDue > 0 && (
                  <p className="text-xs text-gray-600 mt-2">
                    Patient paid R {amountPaid.toFixed(2)} for total of R {totals.total.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Payment Summary for non-Cash */}
            {paymentMethod !== 'Cash' && amountPaid > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">Amount Received ({paymentMethod}):</span>
                  <span className="text-lg font-bold text-gray-900 font-mono">
                    R {amountPaid.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Patient Modal */}
      <PatientModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onPatientCreated={handlePatientCreated}
      />
    </Layout>
  );
}
