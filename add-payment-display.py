#!/usr/bin/env python3
"""
Add Payment Information Display to InvoiceDetail.tsx
Gate S5 - Patient & Payment Management
"""

import os
import re

# File path
file_path = r"apps\web\src\pages\InvoiceDetail.tsx"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Payment display section to add before closing </Layout>
payment_section = """
      {/* Payment Information (Gate S5) */}
      {invoice.amount_paid !== null && invoice.amount_paid > 0 && (
        <div className="card mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💳 Payment Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Amount Paid</p>
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {formatCurrency(invoice.amount_paid)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Payment Method</p>
              <p className="text-lg font-bold text-gray-900">{invoice.payment_method || 'N/A'}</p>
            </div>
          </div>

          {/* Change Due Display (for Cash payments) */}
          {invoice.payment_method === 'Cash' && invoice.change_due !== null && invoice.change_due > 0 && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Change Returned:</span>
                <span className="text-3xl font-bold text-primary font-mono">
                  {formatCurrency(invoice.change_due)}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Patient paid {formatCurrency(invoice.amount_paid)} for total of {formatCurrency(invoice.total_amount)}
              </p>
            </div>
          )}

          {/* Payment Summary for non-Cash */}
          {invoice.payment_method !== 'Cash' && invoice.amount_paid > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Amount Received ({invoice.payment_method}):</span>
                <span className="text-xl font-bold text-gray-900 font-mono">
                  {formatCurrency(invoice.amount_paid)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
"""

# Insert before closing </Layout> tag
pattern = r"(      </div>\n    </Layout>)"
content = re.sub(pattern, payment_section + r"\1", content)

# Write the updated content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Payment display section added successfully to InvoiceDetail.tsx")
