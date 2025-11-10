#!/usr/bin/env python3
"""
Add Payment Information to PDF Generator
Gate S5 - Patient & Payment Management
"""

import os
import re

# File path
file_path = r"apps\web\src\lib\pdfGenerator.ts"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Payment section to add before Notes section
payment_section = """
  // Payment Information (Gate S5)
  if (invoice.amount_paid !== null && invoice.amount_paid > 0) {
    yPos += 15;

    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Payment Information', margin, yPos);

    yPos += 8;

    // Payment details box
    doc.setFillColor(240, 253, 244); // green-50
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 20, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Amount Paid:', margin + 5, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(invoice.amount_paid), margin + 40, yPos);

    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.text('Payment Method:', margin + 5, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.payment_method || 'N/A', margin + 40, yPos);

    // Change due for Cash payments
    if (invoice.payment_method === 'Cash' && invoice.change_due !== null && invoice.change_due > 0) {
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.text('Change Returned:', margin + 5, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(formatCurrency(invoice.change_due), margin + 40, yPos);
      doc.setTextColor(...textColor);
    }

    yPos += 10;
  }
"""

# Insert before Notes section
pattern = r"(  doc\.setTextColor\(\.\.\.textColor\);\n\n  // Notes \(if any\))"
content = re.sub(pattern, r"  doc.setTextColor(...textColor);\n" + payment_section + "\n  // Notes (if any)", content)

# Write the updated content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Payment information section added successfully to pdfGenerator.ts")
