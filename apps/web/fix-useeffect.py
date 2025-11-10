#!/usr/bin/env python3
"""Move useEffect before conditional returns"""

file_path = r"f:\Digital Agency\Refodile Health Centre\Dentist\Dr.Tebeila Dental Studio\apps\web\src\pages\InvoiceNew.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the useEffect block (should be around lines 59-61)
# We need to find it and move it before the first if statement

# First, let's find the useEffect block
useeffect_start = None
for i, line in enumerate(lines):
    if 'useEffect(() => {' in line and i > 50:  # Find the one after hooks
        useeffect_start = i
        break

if useeffect_start is None:
    print("ERROR: Could not find useEffect")
    exit(1)

# The useEffect block is 3 lines:
# Line i: useEffect(() => {
# Line i+1: fetchData();
# Line i+2: }, [tenantId]);
useeffect_block = lines[useeffect_start:useeffect_start+3]

# Remove these 3 lines plus the blank line before it
del lines[useeffect_start-1:useeffect_start+3]

# Now find where to insert (after the last useState, before the first if)
# Look for line with "const [lineItems"
insert_after = None
for i, line in enumerate(lines):
    if 'const [lineItems' in line:
        insert_after = i
        break

# Insert after lineItems (with a blank line before)
lines.insert(insert_after + 2, '\n')
for line in reversed(useeffect_block):
    lines.insert(insert_after + 2, line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("OK Moved useEffect before conditional returns")
