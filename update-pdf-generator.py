#!/usr/bin/env python3
"""
Add id_number and home_address to PDF generator patient info
Schema v4.1
"""

import re

file_path = r"apps\web\src\lib\pdfGenerator.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the Patient Information section in PDF
old_section = r"""  // Patient Information
  doc\.setFont\('helvetica', 'bold'\);
  doc\.setFontSize\(12\);
  doc\.text\('Patient Information', margin, yPos\);

  yPos \+= 6;

  doc\.setFont\('helvetica', 'normal'\);
  doc\.setFontSize\(10\);
  doc\.text\(`Name: \$\{invoice\.customer\.name\}`, margin, yPos\);

  if \(invoice\.customer\.email\) \{
    yPos \+= 5;
    doc\.text\(`Email: \$\{invoice\.customer\.email\}`, margin, yPos\);
  \}

  if \(invoice\.customer\.phone\) \{
    yPos \+= 5;
    doc\.text\(`Phone: \$\{invoice\.customer\.phone\}`, margin, yPos\);
  \}

  yPos \+= 10;"""

new_section = r"""  // Patient Information
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Patient Information', margin, yPos);

  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${invoice.customer.name}`, margin, yPos);

  if (invoice.customer.cell) {
    yPos += 5;
    doc.text(`Cell: ${invoice.customer.cell}`, margin, yPos);
  }

  if (invoice.customer.email) {
    yPos += 5;
    doc.text(`Email: ${invoice.customer.email}`, margin, yPos);
  }

  if (invoice.customer.phone) {
    yPos += 5;
    doc.text(`Phone: ${invoice.customer.phone}`, margin, yPos);
  }

  if (invoice.customer.id_number) {
    yPos += 5;
    doc.text(`ID Number: ${invoice.customer.id_number}`, margin, yPos);
  }

  if (invoice.customer.home_address) {
    yPos += 5;
    const addressLines = doc.splitTextToSize(`Address: ${invoice.customer.home_address}`, pageWidth - 2 * margin);
    doc.text(addressLines, margin, yPos);
    yPos += (addressLines.length - 1) * 5;
  }

  yPos += 10;"""

content = re.sub(old_section, new_section, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("PDF generator updated with id_number and home_address fields")
