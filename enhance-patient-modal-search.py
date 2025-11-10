#!/usr/bin/env python3
"""
Enhance PatientModal with Search Existing Patient functionality
Gate S6.2 - Functional Refinement
"""

import re

file_path = r"apps\web\src\components\PatientModal.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports to include useEffect
content = re.sub(
    r"import \{ useState, FormEvent \} from 'react';",
    r"import { useState, useEffect, FormEvent } from 'react';",
    content
)

# 2. Add search mode state and search results after formData state
state_addition = r"""  const [formData, setFormData] = useState<PatientFormData>({
    first_name: '',
    last_name: '',
    cell: '',
    email: '',
    id_number: '',
    home_address: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<PatientFormData>>({});
  const [saving, setSaving] = useState(false);

  // Search functionality (Gate S6.2)
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);"""

content = re.sub(
    r"(const \[formData, setFormData\] = useState<PatientFormData>\(\{[^}]+\}\);)\s+(const \[errors, setErrors\] = useState<Partial<PatientFormData>>\(\{\}\);)\s+(const \[saving, setSaving\] = useState\(false\);)",
    state_addition,
    content,
    flags=re.DOTALL
)

# 3. Add debounced search useEffect before validateForm function
search_effect = r"""
  // Debounced patient search (Gate S6.2)
  useEffect(() => {
    if (!isSearchMode || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, first_name, last_name, cell, email, id_number, home_address, notes')
          .eq('tenant_id', tenantId!)
          .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,cell.ilike.%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error('[PATIENT_SEARCH_ERROR]', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, isSearchMode, tenantId]);

  // Handle patient selection from search results
  const handleSelectPatient = (patient: any) => {
    setFormData({
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      cell: patient.cell || '',
      email: patient.email || '',
      id_number: patient.id_number || '',
      home_address: patient.home_address || '',
      notes: patient.notes || '',
    });
    setIsSearchMode(false);
    setSearchQuery('');
    setSearchResults([]);
  };

"""

content = re.sub(
    r"(\s+const validateForm = \(\): boolean => \{)",
    search_effect + r"\1",
    content
)

# 4. Update header to include search toggle
old_header = r"""        {/\* Header \*/}
        <div className="bg-gradient-to-r from-primary to-secondary p-6">
          <h2 className="text-2xl font-bold text-white">Add New Patient</h2>
          <p className="text-white text-sm mt-1">Complete patient information</p>
        </div>"""

new_header = r"""        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-6">
          <h2 className="text-2xl font-bold text-white">
            {isSearchMode ? 'Search Existing Patient' : 'Add New Patient'}
          </h2>
          <p className="text-white text-sm mt-1">
            {isSearchMode ? 'Find patient by name or cell number' : 'Complete patient information'}
          </p>
        </div>"""

content = re.sub(old_header, new_header, content, flags=re.DOTALL)

# 5. Add search/create toggle button at the start of the form
toggle_button = r"""
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Search/Create Toggle */}
          <div className="flex justify-center pb-2 border-b border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsSearchMode(!isSearchMode);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="text-sm text-primary hover:text-primary-600 font-medium transition-colors"
              disabled={saving}
            >
              {isSearchMode ? '+ Create New Patient Instead' : '🔍 Search Existing Patient'}
            </button>
          </div>

          {/* Search Mode */}
          {isSearchMode && (
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Patient
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                placeholder="Type name, surname, or cell number..."
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 2 characters to search</p>

              {/* Search Results */}
              {isSearching && (
                <div className="mt-3 text-center text-sm text-gray-500">Searching...</div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="mt-3 border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                  {searchResults.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => handleSelectPatient(patient)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="font-medium text-gray-900">
                        {patient.first_name} {patient.last_name}
                      </div>
                      {patient.cell && (
                        <div className="text-sm text-gray-600">{patient.cell}</div>
                      )}
                      {patient.email && (
                        <div className="text-xs text-gray-500">{patient.email}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="mt-3 text-center text-sm text-gray-500">
                  No patients found. Try a different search or create a new patient.
                </div>
              )}
            </div>
          )}

          {/* Create Form (only show when not in search mode) */}
          {!isSearchMode && (
            <>"""

content = re.sub(
    r"(        {/\* Form \*/}\n        <form onSubmit=\{handleSubmit\} className=\"p-6 space-y-4\">\n)",
    toggle_button,
    content
)

# 6. Close the conditional render before action buttons
old_buttons = r"""          {/\* Action Buttons \*/}
          <div className="flex gap-3 pt-4">"""

new_buttons = r"""            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">"""

content = re.sub(old_buttons, new_buttons, content, flags=re.DOTALL)

# 7. Update button logic to handle search mode
old_button_code = r"""            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving \? 'Saving\.\.\.' : 'Create Patient'}
            </button>"""

new_button_code = r"""            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={saving || isSearchMode}
            >
              {saving ? 'Saving...' : 'Create Patient'}
            </button>"""

content = re.sub(old_button_code, new_button_code, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("PatientModal enhanced with search functionality")
