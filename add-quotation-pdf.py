#!/usr/bin/env python3
"""
Add QUOTATION watermark and accounting fields to PDF generator
Gate S6.2 - Functional Refinement
"""

import re

file_path = r"apps\web\src\lib\pdfGenerator.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add quotation watermark after header
watermark_code = r"""
  // Quotation Watermark (Gate S6.2)
  if (invoice.status === 'Quotation') {
    doc.setFontSize(60);
    doc.setTextColor(200, 200, 200); // Light gray
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTATION', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45,
    });
    doc.setTextColor(...textColor); // Reset color
  }
"""

# Insert after yPos = 55 line
content = re.sub(
    r"(  yPos = 55;)",
    r"\1" + watermark_code,
    content
)

# 2. Update Invoice Number section to show QUOTATION or INVOICE
old_invoice_num = r"(  doc\.text\(`Invoice: \$\{invoice\.invoice_number \|\| 'DRAFT'\}`, margin, yPos\);)"
new_invoice_num = r"""  doc.text(
    `${invoice.status === 'Quotation' ? 'Quotation' : 'Invoice'}: ${invoice.invoice_number || 'DRAFT'}`,
    margin,
    yPos
  );"""

content = re.sub(old_invoice_num, new_invoice_num, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Quotation watermark and branding added to PDF generator")
