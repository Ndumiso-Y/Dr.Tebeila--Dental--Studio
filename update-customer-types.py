#!/usr/bin/env python3
"""
Add id_number and home_address to Customer TypeScript interface
Schema v4.1
"""

import re

file_path = r"apps\web\src\lib\supabase.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add fields to Customer interface before the closing brace
content = re.sub(
    r"(export interface Customer \{[^}]+is_active: boolean;\n  created_at: string;\n  updated_at: string;\n)\}",
    r"\1  // Gate S5.1 - Additional patient fields\n  first_name?: string | null;\n  last_name?: string | null;\n  cell?: string | null;\n  id_number?: string | null;\n  home_address?: string | null;\n}",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Customer interface updated with id_number and home_address fields")
