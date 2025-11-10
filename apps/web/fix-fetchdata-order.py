#!/usr/bin/env python3
"""Move fetchData function before useEffect"""

file_path = r"f:\Digital Agency\Refodile Health Centre\Dentist\Dr.Tebeila Dental Studio\apps\web\src\pages\InvoiceNew.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find fetchData function (starts around line 64)
fetchdata_start = None
for i, line in enumerate(lines):
    if 'const fetchData = async () => {' in line:
        fetchdata_start = i
        break

if fetchdata_start is None:
    print("ERROR: Could not find fetchData function")
    exit(1)

# Find the end of fetchData function (closing brace and semicolon)
fetchdata_end = None
for i in range(fetchdata_start, len(lines)):
    if lines[i].strip() == '};':
        fetchdata_end = i
        break

if fetchdata_end is None:
    print("ERROR: Could not find end of fetchData")
    exit(1)

# Extract fetchData function (including blank line before if there is one)
start_extract = fetchdata_start
if fetchdata_start > 0 and lines[fetchdata_start - 1].strip() == '':
    start_extract = fetchdata_start - 1

fetchdata_block = lines[start_extract:fetchdata_end + 1]

# Remove fetchData from original location
del lines[start_extract:fetchdata_end + 1]

# Find where to insert (after useState hooks, before useEffect)
# Look for the useEffect line
useeffect_line = None
for i, line in enumerate(lines):
    if 'useEffect(() => {' in line and 'fetchData' in lines[i+1]:
        useeffect_line = i
        break

# Insert fetchData right before useEffect (with blank line after)
lines = lines[:useeffect_line] + fetchdata_block + ['\n'] + lines[useeffect_line:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("OK Moved fetchData before useEffect")
print(f"  - Function moved from line ~{fetchdata_start} to before useEffect")
