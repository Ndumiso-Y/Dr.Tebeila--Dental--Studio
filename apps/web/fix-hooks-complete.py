#!/usr/bin/env python3
"""Complete fix for hooks order in InvoiceNew.tsx"""

file_path = r"f:\Digital Agency\Refodile Health Centre\Dentist\Dr.Tebeila Dental Studio\apps\web\src\pages\InvoiceNew.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find line 57 which has the problematic useState
# Move it to line 34 (after the other useState calls)

# Line 57 (index 56) contains: const [lineItems, setLineItems] = useState<LineItem[]>([]);
orphaned_hook = lines[56]

# Remove it from line 57
new_lines = lines[:56] + lines[57:]

# Insert it after line 33 (index 32), which becomes index 33 after we delete line 57
# But we need to insert BEFORE we delete, so insert at original index 33
new_lines = lines[:33] + [orphaned_hook] + lines[33:56] + lines[57:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("OK Fixed hooks order - moved lineItems useState before conditional returns")
