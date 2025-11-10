import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientCreated: (patientId: string) => void;
}

interface PatientFormData {
  first_name: string;
  last_name: string;
  cell: string;
  email: string;
  id_number: string;
  home_address: string;
  notes: string;
}

export default function PatientModal({ isOpen, onClose, onPatientCreated }: PatientModalProps) {
  const { tenantId } = useAuth();
  const [formData, setFormData] = useState<PatientFormData>({
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

  const validateForm = (): boolean => {
    const newErrors: Partial<PatientFormData> = {};

    // Required fields
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.cell.trim()) {
      newErrors.cell = 'Cell phone is required';
    } else if (!/^0[6-8][0-9]{8}$/.test(formData.cell.replace(/\s/g, ''))) {
      newErrors.cell = 'Invalid South African cell number (e.g., 082 123 4567)';
    }

    // Optional email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!tenantId) {
      alert('Authentication error: No tenant ID found');
      return;
    }

    try {
      setSaving(true);

      // Create combined name for backward compatibility
      const name = `${formData.first_name.trim()} ${formData.last_name.trim()}`;

      const { data, error } = await supabase
        .from('customers')
        .insert({
          tenant_id: tenantId,
          name, // Keeps existing 'name' field populated
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          cell: formData.cell.replace(/\s/g, ''), // Remove spaces
          email: formData.email.trim() || null,
          id_number: formData.id_number.trim() || null,
          home_address: formData.home_address.trim() || null,
          notes: formData.notes.trim() || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      console.log('[PATIENT_CREATED]', data.id);

      // Notify parent component
      onPatientCreated(data.id);

      // Reset form and close
      setFormData({
        first_name: '',
        last_name: '',
        cell: '',
        email: '',
        id_number: '',
        home_address: '',
        notes: '',
      });
      setErrors({});
      onClose();
    } catch (error: any) {
      console.error('[PATIENT_CREATE_ERROR]', error);
      alert(`Failed to create patient: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setFormData({
        first_name: '',
        last_name: '',
        cell: '',
        email: '',
        id_number: '',
        home_address: '',
        notes: '',
      });
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-6">
          <h2 className="text-2xl font-bold text-white">Add New Patient</h2>
          <p className="text-white text-sm mt-1">Complete patient information</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* First Name */}
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className={`input ${errors.first_name ? 'border-red-500' : ''}`}
              placeholder="John"
              disabled={saving}
            />
            {errors.first_name && (
              <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className={`input ${errors.last_name ? 'border-red-500' : ''}`}
              placeholder="Dlamini"
              disabled={saving}
            />
            {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
          </div>

          {/* Cell Phone */}
          <div>
            <label htmlFor="cell" className="block text-sm font-medium text-gray-700 mb-1">
              Cell Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="cell"
              value={formData.cell}
              onChange={(e) => setFormData({ ...formData, cell: e.target.value })}
              className={`input ${errors.cell ? 'border-red-500' : ''}`}
              placeholder="082 123 4567"
              disabled={saving}
            />
            {errors.cell && <p className="text-red-500 text-xs mt-1">{errors.cell}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`input ${errors.email ? 'border-red-500' : ''}`}
              placeholder="john.dlamini@example.com"
              disabled={saving}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>


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
          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 text-xs">(allergies, medical remarks)</span>
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input resize-none"
              rows={3}
              placeholder="Penicillin allergy, prefers morning appointments..."
              disabled={saving}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-outline flex-1"
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : 'Create Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
