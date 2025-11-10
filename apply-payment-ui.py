#!/usr/bin/env python3
"""
Apply Payment UI Integration to InvoiceNew.tsx
Gate S5 - Patient & Payment Management
"""

import os
import re

# File path
file_path = r"apps\web\src\pages\InvoiceNew.tsx"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Add payment state variables after line 33 (after const [notes, setNotes] = useState('');)
payment_state = """
  // Payment tracking state (Gate S5)
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [changeDue, setChangeDue] = useState<number>(0);
"""

# Find the insertion point
pattern1 = r"(const \[notes, setNotes\] = useState\(''\);\n)"
content = re.sub(pattern1, r"\1" + payment_state + "\n", content)

# Step 2: Add useEffect for change calculation after line 86 (after the existing useEffect)
change_effect = """
  // Auto-calculate change due for Cash payments (Gate S5)
  useEffect(() => {
    const totals = calculateTotals();
    if (paymentMethod === 'Cash' && amountPaid > 0) {
      setChangeDue(Math.max(amountPaid - totals.total, 0));
    } else {
      setChangeDue(0);
    }
  }, [amountPaid, paymentMethod, lineItems]);
"""

pattern2 = r"(useEffect\(\(\) => \{\s+fetchData\(\);\s+\}, \[tenantId\]\);)"
content = re.sub(pattern2, r"\1\n" + change_effect, content)

# Step 3: Update handleSubmit to include payment fields
old_insert = r"(paid_amount: 0,\s+notes,)"
new_insert = r"\1\n        // Payment tracking fields (Gate S5)\n        amount_paid: amountPaid,\n        payment_method: paymentMethod,\n        change_due: changeDue,"

content = re.sub(old_insert, new_insert, content)

# Step 4: Add Payment Details section before closing </form> tag
payment_section = """
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
"""

# Insert before closing </form> tag
pattern4 = r"(        \}\)\n      \}\)\n      </form>)"
content = re.sub(pattern4, payment_section + r"\1", content)

# Write the updated content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Payment UI integration applied successfully to InvoiceNew.tsx")
print("✅ Changes:")
print("   - Added payment state variables (amountPaid, paymentMethod, changeDue)")
print("   - Added useEffect for automatic change calculation")
print("   - Updated handleSubmit to save payment fields")
print("   - Added Payment Details section UI")
