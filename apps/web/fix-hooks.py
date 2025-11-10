#!/usr/bin/env python3
"""Fix Rules of Hooks violation in InvoiceNew.tsx"""

file_path = r"f:\Digital Agency\Refodile Health Centre\Dentist\Dr.Tebeila Dental Studio\apps\web\src\pages\InvoiceNew.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the lines to move
# Lines 51-57 (useState calls) need to move before line 28 (first if statement)

# Extract lines 51-57 (indices 50-56)
hooks_to_move = lines[50:57]

# Remove those lines
new_lines = lines[:50] + lines[57:]

# Insert at line 27 (after the first batch of useState, before the ifs)
# Line 27 is index 26
insert_index = 26

# Insert the hooks
new_lines = new_lines[:insert_index] + hooks_to_move + new_lines[insert_index:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("OK Fixed hooks order in InvoiceNew.tsx")
print("  - Moved 7 useState calls before conditional returns")
