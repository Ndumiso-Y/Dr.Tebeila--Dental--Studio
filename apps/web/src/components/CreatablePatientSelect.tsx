import { useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import { supabase, Customer } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PatientOption {
  value: string;
  label: string;
  __isNew__?: boolean;
}

interface CreatablePatientSelectProps {
  value: string;
  onChange: (patientId: string) => void;
  patients: Customer[];
  onPatientCreated: (newPatient: Customer) => void;
}

export default function CreatablePatientSelect({
  value,
  onChange,
  patients,
  onPatientCreated,
}: CreatablePatientSelectProps) {
  const { tenantId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Convert customers to options
  const options: PatientOption[] = patients.map((patient) => ({
    value: patient.id,
    label: patient.name,
  }));

  // Find selected option
  const selectedOption = options.find((opt) => opt.value === value) || null;

  const handleCreate = async (inputValue: string) => {
    if (!tenantId) {
      alert('No tenant ID available. Please refresh and try again.');
      return;
    }

    setIsLoading(true);
    console.log('[PATIENT_CREATE] Creating new patient:', inputValue);

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          tenant_id: tenantId,
          name: inputValue,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('[PATIENT_CREATED]', data);
      onPatientCreated(data);
      onChange(data.id);
    } catch (error: any) {
      console.error('[PATIENT_CREATE_ERROR]', error);
      alert(`Failed to create patient: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CreatableSelect
      isClearable
      isDisabled={isLoading}
      isLoading={isLoading}
      onChange={(newValue) => {
        onChange(newValue ? newValue.value : '');
      }}
      onCreateOption={handleCreate}
      options={options}
      value={selectedOption}
      placeholder="Select or type to create a patient..."
      formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
      styles={{
        control: (base, state) => ({
          ...base,
          backgroundColor: '#ffffff',
          borderColor: state.isFocused ? '#05984B' : '#d1d5db',
          boxShadow: state.isFocused ? '0 0 0 2px rgba(5, 152, 75, 0.2)' : 'none',
          '&:hover': {
            borderColor: state.isFocused ? '#05984B' : '#d1d5db',
          },
          minHeight: '42px',
        }),
        input: (base) => ({
          ...base,
          color: '#111827',
        }),
        placeholder: (base) => ({
          ...base,
          color: '#6b7280',
        }),
        singleValue: (base) => ({
          ...base,
          color: '#111827',
        }),
        option: (base, state) => ({
          ...base,
          backgroundColor: state.isSelected
            ? '#05984B'
            : state.isFocused
            ? '#f3f4f6'
            : '#ffffff',
          color: state.isSelected ? '#ffffff' : '#111827',
          cursor: 'pointer',
          '&:active': {
            backgroundColor: '#059847',
          },
        }),
      }}
    />
  );
}
