#!/usr/bin/env python3
"""
Add Payment Fields to Invoice TypeScript Interface
Gate S5 - Patient & Payment Management
"""

import os
import re

# File path
file_path = r"apps\web\src\lib\supabase.ts"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add payment fields to Invoice interface before the closing brace
old_interface = r"(  finalized_at: string \| null;\n  finalized_by: string \| null;\n})"
new_interface = r"  finalized_at: string | null;\n  finalized_by: string | null;\n  // Gate S5 - Payment tracking fields\n  amount_paid?: number | null;\n  payment_method?: string | null;\n  change_due?: number | null;\n}"

content = re.sub(old_interface, new_interface, content)

# Write the updated content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Payment fields added successfully to Invoice interface")
