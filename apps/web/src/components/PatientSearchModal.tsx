import { useState, useEffect } from 'react';
import { supabase, Customer } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PatientModal from './PatientModal';

interface PatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientSelected: (patient: Customer) => void;
}

export default function PatientSearchModal({ isOpen, onClose, onPatientSelected }: PatientSearchModalProps) {
  const { tenantId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);

  // Debounced patient search (300ms)
  useEffect(() => {
    if (!isOpen || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('tenant_id', tenantId!)
          .eq('is_active', true)
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
  }, [searchQuery, isOpen, tenantId]);

  const handleSelectPatient = (patient: Customer) => {
    onPatientSelected(patient);
    handleClose();
  };

  const handlePatientCreated = async (patientId: string) => {
    // Fetch the newly created patient
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('id', patientId)
      .single();

    if (data) {
      onPatientSelected(data as Customer);
      handleClose();
    }

    setIsPatientModalOpen(false);
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-secondary p-6">
            <h2 className="text-2xl font-bold text-white">Search Patient</h2>
            <p className="text-white text-sm mt-1">Find patient by name or cell number</p>
          </div>

          {/* Search Input */}
          <div className="p-6">
            <div className="mb-4">
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
            </div>

            {/* Search Results */}
            {isSearching && (
              <div className="mt-3 text-center text-sm text-gray-500">Searching...</div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="mt-3 border border-gray-200 rounded-md max-h-96 overflow-y-auto">
                {searchResults.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => handleSelectPatient(patient)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-gray-900">
                      {patient.first_name} {patient.last_name}
                      {patient.name && patient.name !== `${patient.first_name} ${patient.last_name}` && (
                        <span className="text-sm text-gray-500"> ({patient.name})</span>
                      )}
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

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setIsPatientModalOpen(true)}
                className="btn btn-primary flex-1"
              >
                + New Patient
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Modal (for creating new patients) */}
      <PatientModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onPatientCreated={handlePatientCreated}
      />
    </>
  );
}
