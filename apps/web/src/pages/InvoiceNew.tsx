import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Customer, Service, VATRate } from '../lib/supabase';
import Layout from '../components/Layout';
import { calculateLineTotals } from '../lib/db';

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
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [vatRates, setVATRates] = useState<VATRate[]>([]);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, servicesRes, vatRatesRes] = await Promise.all([
        supabase.from('customers').select('*').eq('is_active', true).order('name'),
        supabase.from('services').select('*').eq('is_active', true).order('name'),
        supabase.from('vat_rates').select('*').eq('is_active', true).order('rate'),
      ]);

      if (customersRes.data) setCustomers(customersRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
      if (vatRatesRes.data) setVATRates(vatRatesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      alert('Please select a customer');
      return;
    }

    if (lineItems.length === 0) {
      alert('Please add at least one line item');
      return;
    }

    setLoading(true);

    try {
      const { subtotal, totalVAT, total } = calculateTotals();

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          customer_id: customerId,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          status: 'Draft',
          subtotal,
          total_vat: totalVAT,
          total_amount: total,
          paid_amount: 0,
          notes,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

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
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
          <div className="space-x-2">
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Invoice Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customer" className="label">
                Customer *
              </label>
              <select
                id="customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="input"
                required
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
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
            <p className="text-gray-500 text-center py-8">
              No line items yet. Click "Add Line" to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-md p-4">
                  <div className="grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-12 sm:col-span-4">
                      <label className="label text-xs">Service</label>
                      <select
                        value={item.service_id}
                        onChange={(e) =>
                          updateLineItem(item.id, 'service_id', e.target.value)
                        }
                        className="input text-sm"
                      >
                        <option value="">Select service</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} - R{service.unit_price}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-12 sm:col-span-3">
                      <label className="label text-xs">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateLineItem(item.id, 'description', e.target.value)
                        }
                        className="input text-sm"
                        placeholder="Description"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-2">
                      <label className="label text-xs">Qty</label>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                        }
                        className="input text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-2">
                      <label className="label text-xs">Unit Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)
                        }
                        className="input text-sm"
                      />
                    </div>

                    <div className="col-span-11 sm:col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Remove"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        {lineItems.length > 0 && (
          <div className="card">
            <div className="max-w-md ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">R{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT:</span>
                <span className="font-medium">R{totals.totalVAT.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span>Total:</span>
                <span>R{totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </form>
    </Layout>
  );
}
