#!/usr/bin/env python3
"""Move line 58 (lineItems useState) to line 35"""

file_path = r"f:\Digital Agency\Refodile Health Centre\Dentist\Dr.Tebeila Dental Studio\apps\web\src\pages\InvoiceNew.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 58 (index 57) has: const [lineItems, setLineItems] = useState<LineItem[]>([]);
lineItems_hook = lines[57]

# Remove line 58
del lines[57]

# Insert after line 35 (which is index 34, but becomes 34 after we delete 57)
# Actually insert at index 35 to put it AFTER line 35
lines.insert(35, lineItems_hook)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("OK Moved lineItems useState to before conditional returns")
