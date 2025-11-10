#!/usr/bin/env python3
"""
Add id_number and home_address to InvoiceDetail patient display
Schema v4.1
"""

import re

file_path = r"apps\web\src\pages\InvoiceDetail.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the Patient Information section
old_section = r"""      {/\* Patient Information \*/}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Patient Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="font-medium">{invoice\.customer\.name}</p>
          </div>
          {invoice\.customer\.email && \(
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{invoice\.customer\.email}</p>
            </div>
          \)}
          {invoice\.customer\.phone && \(
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{invoice\.customer\.phone}</p>
            </div>
          \)}
        </div>
      </div>"""

new_section = r"""      {/* Patient Information */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Patient Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Full Name</p>
            <p className="font-medium">{invoice.customer.name}</p>
          </div>
          {invoice.customer.cell && (
            <div>
              <p className="text-sm text-gray-600">Cell Phone</p>
              <p className="font-medium">{invoice.customer.cell}</p>
            </div>
          )}
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
          {invoice.customer.id_number && (
            <div>
              <p className="text-sm text-gray-600">ID Number</p>
              <p className="font-medium font-mono">{invoice.customer.id_number}</p>
            </div>
          )}
          {invoice.customer.home_address && (
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-sm text-gray-600">Home Address</p>
              <p className="font-medium">{invoice.customer.home_address}</p>
            </div>
          )}
        </div>
      </div>"""

content = re.sub(old_section, new_section, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("InvoiceDetail updated with id_number and home_address display")
