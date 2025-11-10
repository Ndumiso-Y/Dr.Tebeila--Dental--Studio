#!/usr/bin/env python3
"""
Add Quotation mode to InvoiceNew component
Gate S6.2 - Functional Refinement
"""

import re

file_path = r"apps\web\src\pages\InvoiceNew.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add useSearchParams import
content = re.sub(
    r"import \{ useNavigate \} from 'react-router-dom';",
    r"import { useNavigate, useSearchParams } from 'react-router-dom';",
    content
)

# 2. Add quotation mode state after patient modal state
content = re.sub(
    r"(  // Patient modal state\n  const \[isPatientModalOpen, setIsPatientModalOpen\] = useState\(false\);)",
    r"\1\n\n  // Quotation mode (Gate S6.2)\n  const [searchParams] = useSearchParams();\n  const isQuotationMode = searchParams.get('mode') === 'quotation';",
    content
)

# 3. Update the status field in the insert to use Quotation or Draft based on mode
old_insert = r"(          status: 'Draft',)"
new_insert = r"          status: isQuotationMode ? 'Quotation' : 'Draft',"

content = re.sub(old_insert, new_insert, content)

# 4. Update page title to reflect mode
old_title = r"(<h1 className=\"text-2xl font-bold text-gray-900\">Create New Invoice</h1>)"
new_title = r"<h1 className=\"text-2xl font-bold text-gray-900\">\n              {isQuotationMode ? 'Create New Quotation' : 'Create New Invoice'}\n            </h1>"

content = re.sub(old_title, new_title, content)

# 5. Update save button text
old_save_btn = r"(\{loading \? 'Saving\.\.\.' : 'Save Draft'\})"
new_save_btn = r"{loading ? 'Saving...' : (isQuotationMode ? 'Save Quotation' : 'Save Draft')}"

content = re.sub(old_save_btn, new_save_btn, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Quotation mode added to InvoiceNew component")
