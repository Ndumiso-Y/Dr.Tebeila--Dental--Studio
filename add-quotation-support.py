#!/usr/bin/env python3
"""
Add Quotation support to TypeScript types and Invoice Status
Gate S6.2 - Functional Refinement
"""

import re

# Update supabase.ts to add Quotation status
file_path = r"apps\web\src\lib\supabase.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update InvoiceStatus type to include Quotation
content = re.sub(
    r"export type InvoiceStatus = 'Draft' \| 'ProformaOffline' \| 'Finalized' \| 'Paid' \| 'Void';",
    r"export type InvoiceStatus = 'Draft' | 'Quotation' | 'ProformaOffline' | 'Finalized' | 'Paid' | 'Void';",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added Quotation status to InvoiceStatus type")
