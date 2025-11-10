#!/usr/bin/env python3
"""
Integrate PatientModal into InvoiceNew.tsx
Replace CreatablePatientSelect with hybrid dropdown + modal button
"""

import re

file_path = r"apps\web\src\pages\InvoiceNew.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add PatientModal import
content = re.sub(
    r"(import CreatablePatientSelect from '\.\./components/CreatablePatientSelect';)",
    r"import PatientModal from '../components/PatientModal';\n\1",
    content
)

# 2. Add modal state after line 38 (after changeDue state)
content = re.sub(
    r"(const \[changeDue, setChangeDue\] = useState<number>\(0\);\n)",
    r"\1\n  // Patient modal state\n  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);\n",
    content
)

# 3. Update handlePatientCreated to work with modal
content = re.sub(
    r"(const handlePatientCreated = \(newPatient: Customer\) => \{\n    setPatients\(\[\.\.\.patients, newPatient\]\);\n  \};)",
    r"const handlePatientCreated = async (patientId: string) => {\n    // Refresh patient list after creation\n    const { data } = await supabase\n      .from('customers')\n      .select('*')\n      .eq('tenant_id', tenantId!)\n      .eq('is_active', true)\n      .order('name');\n\n    if (data) {\n      setPatients(data);\n      setPatientId(patientId);\n    }\n\n    setIsPatientModalOpen(false);\n  };",
    content
)

# 4. Replace patient selection UI
old_ui = r"""            <div>
              <label htmlFor="patient" className="label">
                Patient \*
              </label>
              <CreatablePatientSelect
                value={patientId}
                onChange={setPatientId}
                patients={patients}
                onPatientCreated={handlePatientCreated}
              />
            </div>"""

new_ui = r"""            <div>
              <label htmlFor="patient" className="label">
                Patient *
              </label>
              <div className="flex gap-2">
                <select
                  id="patient"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="input flex-1"
                  required
                >
                  <option value="">Select a patient...</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                      {patient.cell ? ` - ${patient.cell}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsPatientModalOpen(true)}
                  className="btn btn-primary whitespace-nowrap"
                  title="Add New Patient"
                >
                  + New Patient
                </button>
              </div>
            </div>"""

content = re.sub(old_ui, new_ui, content, flags=re.DOTALL)

# 5. Add PatientModal component before closing Layout tag
modal_component = r"""
      {/* Patient Modal */}
      <PatientModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onPatientCreated={handlePatientCreated}
      />"""

content = re.sub(
    r"(    </Layout>\n  \);\n\})",
    modal_component + r"\n\1",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("PatientModal integrated into InvoiceNew.tsx successfully")
