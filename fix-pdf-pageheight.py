#!/usr/bin/env python3
"""
Fix pageHeight undefined error in pdfGenerator.ts
"""

import re

file_path = r"apps\web\src\lib\pdfGenerator.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add pageHeight constant after pageWidth
content = re.sub(
    r"(  const pageWidth = doc\.internal\.pageSize\.getWidth\(\);)",
    r"\1\n  const pageHeight = doc.internal.pageSize.getHeight();",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed pageHeight undefined error in pdfGenerator.ts")
