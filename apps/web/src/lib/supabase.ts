import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '⚠️ Missing Supabase environment variables!\n' +
    'Please create a .env.local file with:\n' +
    'VITE_SUPABASE_URL=https://your-project-id.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key-here\n'
  );

  // Provide dummy values for development to prevent crash
  // The app will show an error page instead of blank screen
}

// Use dummy values if not configured (will fail auth but won't crash)
const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database types (based on your schema)
export type UserRole = 'owner' | 'admin' | 'staff';
export type InvoiceStatus = 'Draft' | 'ProformaOffline' | 'Finalized' | 'Paid' | 'Void';

export interface UserProfile {
  id: string;
  tenant_id: string;
  full_name: string;
  role: UserRole;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  business_name: string | null;
  vat_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  default_currency: string;
  default_vat_rate_id: string | null;
  invoice_prefix: string;
  primary_color: string;
  secondary_color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VATRate {
  id: string;
  tenant_id: string;
  name: string;
  rate: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  tenant_id: string;
  name: string;
  abbreviation: string;
  is_active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  unit_price: number;
  unit_id: string | null;
  vat_rate_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  vat_number: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string | null;
  customer_id: string;
  invoice_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  subtotal: number;
  total_vat: number;
  total_amount: number;
  paid_amount: number;
  paid_date: string | null;
  payment_reference: string | null;
  notes: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
}

export interface InvoiceItem {
  id: string;
  tenant_id: string;
  invoice_id: string;
  line_order: number;
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate_id: string | null;
  vat_rate: number;
  vat_amount: number;
  line_total: number;
  line_total_incl_vat: number;
  created_at: string;
  updated_at: string;
}

// Extended types with joins
export interface InvoiceWithCustomer extends Invoice {
  customer: Customer;
}

export interface InvoiceWithDetails extends Invoice {
  customer: Customer;
  invoice_items: InvoiceItem[];
}

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co';
};
