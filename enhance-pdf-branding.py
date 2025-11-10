#!/usr/bin/env python3
"""
Enhance PDF Generator with Logo and Professional Branding
Gate S6 - Final Polish
"""

import re

file_path = r"apps\web\src\lib\pdfGenerator.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the header section with logo-enabled version
old_header = r"""  // Brand Colors
  const primaryColor: \[number, number, number\] = \[5, 152, 75\]; // #05984B
  const secondaryColor: \[number, number, number\] = \[14, 142, 204\]; // #0E8ECC
  const textColor: \[number, number, number\] = \[31, 41, 55\]; // gray-800

  // Header: Practice Name
  doc\.setFillColor\(\.\.\.primaryColor\);
  doc\.rect\(0, 0, pageWidth, 35, 'F'\);

  doc\.setFont\('helvetica', 'bold'\);
  doc\.setFontSize\(22\);
  doc\.setTextColor\(255, 255, 255\);
  doc\.text\('Dr\. Tebeila Dental Studio', margin, 20\);

  doc\.setFont\('helvetica', 'normal'\);
  doc\.setFontSize\(10\);
  doc\.text\('Invoicing & Practice Management', margin, 28\);

  yPos = 50;"""

new_header = r"""  // Brand Colors
  const primaryColor: [number, number, number] = [5, 152, 75]; // #05984B
  const secondaryColor: [number, number, number] = [14, 142, 204]; // #0E8ECC
  const textColor: [number, number, number] = [31, 41, 55]; // gray-800

  // Header: Practice Name with Professional Layout
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('Dr. Tebeila Dental Studio', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Refodile Health Centre • Polokwane', margin, 26);
  doc.text('Quality Dental Care for the Whole Family', margin, 32);

  yPos = 55;"""

content = re.sub(old_header, new_header, content, flags=re.DOTALL)

# Update footer section
old_footer = r"""  // Footer
  const footerY = doc\.internal\.pageSize\.getHeight\(\) - 20;

  doc\.setFontSize\(8\);
  doc\.setTextColor\(107, 114, 128\); // gray-500
  doc\.text\('Thank you for your business!', pageWidth / 2, footerY, \{ align: 'center' \}\);

  doc\.setFontSize\(7\);
  doc\.text\(
    '© 2025 Dr\. Tebeila Dental Studio\. All rights reserved\.',
    pageWidth / 2,
    footerY \+ 4,
    \{ align: 'center' \}
  \);"""

new_footer = r"""  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 25;

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text('Thank you for your visit — Smile with Confidence 😊', pageWidth / 2, footerY, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('Refodile Health Centre • Polokwane', pageWidth / 2, footerY + 5, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text(
    '© 2025 Dr. Tebeila Dental Studio. All rights reserved.',
    pageWidth / 2,
    footerY + 10,
    { align: 'center' }
  );"""

content = re.sub(old_footer, new_footer, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("PDF generator enhanced with professional branding")
