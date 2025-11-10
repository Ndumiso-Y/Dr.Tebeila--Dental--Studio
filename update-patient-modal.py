#!/usr/bin/env python3
"""
Add id_number and home_address to PatientModal
Schema v4.1 - Patient Information Enhancement
"""

import re

file_path = r"apps\web\src\components\PatientModal.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update PatientFormData interface
content = re.sub(
    r"(interface PatientFormData \{\n  first_name: string;\n  last_name: string;\n  cell: string;\n  email: string;\n  notes: string;\n\})",
    r"interface PatientFormData {\n  first_name: string;\n  last_name: string;\n  cell: string;\n  email: string;\n  id_number: string;\n  home_address: string;\n  notes: string;\n}",
    content
)

# 2. Update useState initial state
content = re.sub(
    r"(const \[formData, setFormData\] = useState<PatientFormData>\(\{\n    first_name: '',\n    last_name: '',\n    cell: '',\n    email: '',\n    notes: '',\n  \}\);)",
    r"const [formData, setFormData] = useState<PatientFormData>({\n    first_name: '',\n    last_name: '',\n    cell: '',\n    email: '',\n    id_number: '',\n    home_address: '',\n    notes: '',\n  });",
    content
)

# 3. Update database insert
content = re.sub(
    r"(cell: formData\.cell\.replace\(/\\s/g, ''\), // Remove spaces\n          email: formData\.email\.trim\(\) \|\| null,\n          notes: formData\.notes\.trim\(\) \|\| null,)",
    r"cell: formData.cell.replace(/\\s/g, ''), // Remove spaces\n          email: formData.email.trim() || null,\n          id_number: formData.id_number.trim() || null,\n          home_address: formData.home_address.trim() || null,\n          notes: formData.notes.trim() || null,",
    content
)

# 4. Update form reset (first occurrence)
content = re.sub(
    r"(setFormData\(\{\n        first_name: '',\n        last_name: '',\n        cell: '',\n        email: '',\n        notes: '',\n      \}\);)",
    r"setFormData({\n        first_name: '',\n        last_name: '',\n        cell: '',\n        email: '',\n        id_number: '',\n        home_address: '',\n        notes: '',\n      });",
    content,
    count=1
)

# 5. Update form reset (second occurrence in handleClose)
content = re.sub(
    r"(setFormData\(\{\n        first_name: '',\n        last_name: '',\n        cell: '',\n        email: '',\n        notes: '',\n      \}\);)",
    r"setFormData({\n        first_name: '',\n        last_name: '',\n        cell: '',\n        email: '',\n        id_number: '',\n        home_address: '',\n        notes: '',\n      });",
    content,
    count=1
)

# 6. Add form fields in JSX before Notes section
form_fields = """
          {/* ID Number */}
          <div>
            <label htmlFor="id_number" className="block text-sm font-medium text-gray-700 mb-1">
              ID Number <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="text"
              id="id_number"
              value={formData.id_number}
              onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
              className="input"
              placeholder="8501015800080"
              maxLength={13}
              disabled={saving}
            />
            <p className="text-xs text-gray-500 mt-1">South African ID number (13 digits)</p>
          </div>

          {/* Home Address */}
          <div>
            <label htmlFor="home_address" className="block text-sm font-medium text-gray-700 mb-1">
              Home Address <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea
              id="home_address"
              value={formData.home_address}
              onChange={(e) => setFormData({ ...formData, home_address: e.target.value })}
              className="input resize-none"
              rows={2}
              placeholder="123 Main Street, Suburb, City, Postal Code"
              disabled={saving}
            />
          </div>
"""

content = re.sub(
    r"(          {/\* Notes \*/}\n)",
    form_fields + r"\1",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("PatientModal updated with id_number and home_address fields")
