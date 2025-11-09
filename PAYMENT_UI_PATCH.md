# Payment UI Integration Patch for InvoiceNew.tsx

## Summary
Add payment tracking fields (Amount Paid, Payment Method, Change Due) to InvoiceNew.tsx

---

## Step 1: Add Payment State (after line 33)

```typescript
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // ✅ ADD THESE LINES:
  // Payment tracking state
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [changeDue, setChangeDue] = useState<number>(0);

  const [vatRates, setVATRates] = useState<VATRate[]>([]);
```

---

## Step 2: Add useEffect for Change Calculation (after line 86)

```typescript
  useEffect(() => {
    fetchData();
  }, [tenantId]);

  // ✅ ADD THIS useEffect:
  // Auto-calculate change due for Cash payments
  useEffect(() => {
    const totals = calculateTotals();
    if (paymentMethod === 'Cash' && amountPaid > 0) {
      setChangeDue(Math.max(amountPaid - totals.total, 0));
    } else {
      setChangeDue(0);
    }
  }, [amountPaid, paymentMethod, lineItems]);
```

---

## Step 3: Update handleSubmit (line 208-219)

**FIND:**
```typescript
      .insert({
        invoice_number: invoiceNumber,
        customer_id: patientId,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        status: 'Draft',
        subtotal,
        total_vat: totalVAT,
        total_amount: total,
        paid_amount: 0,
        notes,
      })
```

**REPLACE WITH:**
```typescript
      .insert({
        invoice_number: invoiceNumber,
        customer_id: patientId,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        status: 'Draft',
        subtotal,
        total_vat: totalVAT,
        total_amount: total,
        paid_amount: 0,
        notes,
        // ✅ ADD PAYMENT FIELDS:
        amount_paid: amountPaid,
        payment_method: paymentMethod,
        change_due: changeDue,
      })
```

---

## Step 4: Add Payment Details Section (after line 574, before closing </form>)

**INSERT AFTER the Invoice Totals Summary card:**

```tsx
        {/* Payment Details Section */}
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
                  <option value="Card">�� Card</option>
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
```

---

## Testing

After applying these changes:

1. Start dev server: `npm run dev`
2. Navigate to "New Invoice"
3. Add line items
4. Scroll to "Payment Details" section
5. Enter amount paid (e.g., R500)
6. Select "Cash" as payment method
7. Verify change calculation appears
8. Switch to "Card" - change should disappear
9. Save invoice and check database

---

## Database Requirement

**IMPORTANT**: Run this migration first:
```
db/migrations/005_add_patient_payment_fields.sql
```

Without the migration, invoice save will fail due to missing columns.

---

